#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createPolar } from "@polar-sh/sdk/2026-10";
import mjml2html from "mjml";
import { Plunk } from "plunk-node-sdk";

const PAGE_SIZE = 100;
const siteUrl =
    process.env.MIGRATION_SITE_URL ||
    (process.env.BETTER_AUTH_URL?.includes("localhost")
        ? "https://readyto.gift"
        : process.env.BETTER_AUTH_URL) ||
    "https://readyto.gift";
const templatePath = fileURLToPath(
    new URL(
        "../src/utils/email/templates/email-template.mjml",
        import.meta.url,
    ),
);

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
};

const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const getArgumentValue = (name) =>
    process.argv
        .find((argument) => argument.startsWith(`${name}=`))
        ?.slice(name.length + 1);

const createD1Database = () => {
    const accountId = required("CLOUDFLARE_ACCOUNT_ID");
    const databaseId = required("CLOUDFLARE_DATABASE_ID");
    const token = required("CLOUDFLARE_D1_TOKEN");
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    return async (sql, params = []) => {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ sql, params }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
            throw new Error(
                `D1 query failed: ${JSON.stringify(payload.errors || payload)}`,
            );
        }

        return payload.result?.[0]?.results || [];
    };
};

const createPolarClient = () =>
    createPolar({
        accessToken: required("POLAR_ACCESS_TOKEN"),
    });

const createRecipientProCode = async ({ polar, user }) => {
    const code = `BETA${randomBytes(8).toString("hex").toUpperCase()}`;
    const discount = await polar.discounts.create({
        basis_points: 10000,
        code,
        duration: "forever",
        max_redemptions: 1,
        max_redemptions_per_customer: 1,
        metadata: {
            migration_user_id: user.id,
            migration_email: user.email,
        },
        name: `Migration gift for ${user.email}`,
        products: [required("POLAR_PRO_PRODUCT_ID")],
        type: "percentage",
    });

    if (!discount.code) {
        throw new Error(`Polar did not return a code for ${user.email}`);
    }

    return discount.code;
};

const listUsers = async (query) => {
    const users = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await query(
            'SELECT id, name, email FROM "user" ORDER BY email LIMIT ? OFFSET ?',
            [PAGE_SIZE, offset],
        );
        users.push(...page);
        if (page.length < PAGE_SIZE) return users;
    }
};

const createEmail = async ({ name, email, proCode }) => {
    const template = await readFile(templatePath, "utf8");
    const contactSupportDefaultSubject = `Readyto.gift migration support - ${email}`;
    const supportMailto = `mailto:support@readyto.gift?subject=${encodeURIComponent(contactSupportDefaultSubject)}`;
    const proOffer = proCode
        ? `<p>As a thank you for being part of Readyto.gift's early days and for sharing your feedback, use code <strong>${escapeHtml(proCode)}</strong> for free Readyto.gift Pro, valid for a lifetime. This ensures you can continue using Readyto.gift as you have been. Thanks!</p>`
        : "";
    let footer =
        `This is an important account migration notice. If you have any problems, please contact our staff at <a href="${supportMailto}">support@readyto.gift</a>.`;
    if (proCode)
        footer +=
            " Use your Pro code for free access. This code is a one-time discount of 100%, renewing indefinitely.";
    const body = `
        <p>Readyto.gift has moved to a new account system to improve security and reliability.</p>
        <p>Your lists and items have been moved, but passwords could not be transferred securely. You will need to set a new password before signing in again.</p>
        <p style="background:#fff4d6;border-left:4px solid #e6a700;padding:12px 16px;"><strong>What you need to do:</strong><br/>Open the password recovery page and follow the instructions sent to this email address.</p>
        <p style="text-align:center;padding:12px 0 4px;"><a href="${escapeHtml(siteUrl)}/dash/recovery/start?email=${encodeURIComponent(email)}" style="display:inline-block;background:#405F91;color:#ffffff!important;padding:12px 22px;border-radius:4px;text-decoration:none;font-weight:bold;">Reset your password</a></p>
        ${proOffer}
        <p>If you have not used Readyto.gift recently, no action is required unless you want to access your account again.</p>
    `;
    const populatedTemplate = template
        .replace("{{body}}", body)
        .replace("{{footer}}", footer)
        .replace("{{greeting}}", `Hello${name ? ` ${escapeHtml(name)}` : ""},`)
        .replace(
            "{{preview}}",
            "Readyto.gift has migrated its account system. Please reset your password before signing in.",
        );

    const { html, errors = [] } = await mjml2html(populatedTemplate);
    if (errors.length) {
        throw new Error(`Email template failed: ${JSON.stringify(errors)}`);
    }
    return html;
};

const main = async () => {
    const query = createD1Database();
    const users = await listUsers(query);
    const requestedEmail = getArgumentValue("--email");
    const limitArgument = getArgumentValue("--limit");
    const limit = limitArgument ? Number.parseInt(limitArgument, 10) : null;
    const recipients = users
        .filter((user) => !requestedEmail || user.email === requestedEmail)
        .slice(0, Number.isInteger(limit) && limit > 0 ? limit : undefined);

    console.log(`Found ${users.length} user(s).`);
    console.log(
        recipients
            .map((user) => `${user.name || "(no name)"} <${user.email}>`)
            .join("\n"),
    );

    if (!process.argv.includes("--send")) {
        console.log("Dry run only. Add --send to deliver these emails.");
        return;
    }

    const plunk = new Plunk({
        secretKey: required("PLUNK_SECRET_KEY"),
        baseUrl: required("PLUNK_BASE_URL"),
        fetch: globalThis.fetch.bind(globalThis),
    });
    const from = required("PLUNK_SENDING_EMAIL");
    const polar = createPolarClient();

    for (const user of recipients) {
        try {
            const proCode = await createRecipientProCode({ polar, user });
            await plunk.send({
                type: "transactional",
                name: "Readyto.gift",
                from,
                to: user.email,
                subject: "Action required: reset your Readyto.gift password",
                body: await createEmail({
                    name: user.name,
                    email: user.email,
                    proCode,
                }),
            });
        } catch (error) {
            console.error("Plunk validation details:", {
                code: error.code,
                statusCode: error.statusCode,
                errors: error.errors,
                raw: error.raw,
            });
            throw error;
        }
        console.log(`Sent migration email to ${user.email}`);
    }
};

main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
});
