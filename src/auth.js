import { waitUntil } from "cloudflare:workers";
import { checkout, polar, portal, usage } from "@polar-sh/better-auth";
import { createPolarCore } from "@polar-sh/sdk/2026-10";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import * as schema from "@/auth-schema";
import { db } from "@/db";
import { sendEmail } from "@/utils/email/index";

const ENABLE_BILLING = import.meta.env.ENABLE_BILLING;
const POLAR_ACCESS_TOKEN = import.meta.env.POLAR_ACCESS_TOKEN;
const POLAR_PRO_PRODUCT_ID = import.meta.env.POLAR_PRO_PRODUCT_ID;

export const requireAuth = (context) => {
    const { user, session } = context.locals;
    if (!user)
        return {
            unauthorizedResponse: new Response(null, { status: 401 }),
            user: null,
            session: null,
        };

    return { unauthorizedResponse: null, user, session };
};

const plugins = [twoFactor()];

if (ENABLE_BILLING) {
    const polarClient = createPolarCore({
        accessToken: POLAR_ACCESS_TOKEN,
    });
    plugins.push(
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
                checkout({
                    products: [
                        {
                            productId: POLAR_PRO_PRODUCT_ID,
                            slug: "pro",
                        },
                    ],
                    successUrl: "/dash/settings/billing?status=success",
                    authenticatedUsersOnly: true,
                }),
                portal(),
                usage(),
            ],
        }),
    );
}

export const auth = betterAuth({
    appName: "Readyto.gift",
    advanced: {
        backgroundTasks: {
            handler: waitUntil,
        },
    },
    baseURL: {
        allowedHosts: [
            "https://readyto.gift",
            "localhost:*",
            "[::1]:*",
            "https://*.readyto.gift",
        ],
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            const body = `You recently requested a password reset.<br/>
                Click the link below to reset your password.<br/><br/>
                <a href="${url}">${url}</a>`;
            const footer = `If you didn't request this, you can ignore this email.`;
            return sendEmail({
                to: user.email,
                name: user.name,
                subject: "Reset Password",
                preview:
                    "You recently requested a password reset. Click the link below to reset your password",
                body,
                footer,
                contactSupportDefaultSubject: `Password Reset Support Request - ${new Date().toLocaleString("en-GB")}`,
            });
        },
    },
    emailVerification: {
        autoSignInAfterVerification: true,
        sendOnSignIn: true,
        sendOnSignUp: true,
        sendVerificationEmail: async ({ user, url }) => {
            const callbackURL = new URL(url).searchParams.get("callbackURL");
            const isEmailChange = callbackURL?.includes("emailChange=pending");
            const body = isEmailChange
                ? `Your email address change is almost complete.<br/>
                    Click the link below to verify your new email address.<br/><br/>
                    <a href="${url}">${url}</a>`
                : `You recently requested email verification.<br/>
                    Click the link below to verify your email address.<br/><br/>
                    <a href="${url}">${url}</a>`;
            return sendEmail({
                to: user.email,
                name: user.name,
                subject: isEmailChange
                    ? "Confirm your new email address"
                    : "Verify your email address",
                preview: isEmailChange
                    ? "Confirm your new Readyto.gift email address"
                    : "Verify your Readyto.gift email address",
                body,
                footer: isEmailChange
                    ? "If you did not request an email address change, you can ignore this email."
                    : "If you did not request this, you can ignore this email.",
            });
        },
    },
    plugins,
    user: {
        changeEmail: {
            enabled: true,
            sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
                const body = `A request was made to change your Readyto.gift email address from ${user.email} to ${newEmail}.<br/>
                    Confirm this change by clicking the link below.<br/><br/>
                    <a href="${url}">${url}</a>`;
                return sendEmail({
                    to: user.email,
                    name: user.name,
                    subject: "Confirm your email address change",
                    preview: "Confirm your Readyto.gift email address change",
                    body,
                    footer: "If you did not request this, you can ignore this email.",
                });
            },
        },
        additionalFields: {
            darkMode: {
                type: "boolean",
                defaultValue: false,
            },
            showTotalPrice: {
                type: "boolean",
                defaultValue: false,
            },
            savedLists: {
                type: "string[]",
                defaultValue: [],
            },
            listSorting: {
                type: "json",
                defaultValue: {
                    type: { name: "Last updated", value: "updatedAt" },
                    order: "asc",
                },
            },
            history: {
                type: "json",
                defaultValue: [],
            },
            hidePWAInstallPrompt: {
                type: "boolean",
                defaultValue: false,
            },
        },
    },
});
