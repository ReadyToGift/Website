import { waitUntil } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import * as schema from "@/auth-schema";
import { db } from "@/db";
import { sendEmail } from "@/utils/email/index";

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

export const auth = betterAuth({
    appName: "ReadytoGift",
    advanced: {
        backgroundTasks: {
            handler: waitUntil,
        },
    },
    baseURL: {
        allowedHosts: ["https://readyto.gift", "localhost:*"],
    },
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
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
        sendVerificationEmail: async ({ user, url }) => {
            const body = `You recently requested email verification.<br/>
                Click the link below to verify your email address.<br/><br/>
                <a href="${url}">${url}</a>`;
            return sendEmail({
                to: user.email,
                name: user.name,
                subject: "Verify your email address",
                preview: "Verify your Readyto.gift email address",
                body,
                footer: "If you did not request this, you can ignore this email.",
            });
        },
    },
    plugins: [twoFactor()],
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
            spoilSurprises: {
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
