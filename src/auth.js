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
                preview: "You recently requested a password reset. Click the link below to reset your password",
                body,
                footer,
                contactSupportDefaultSubject: `Password Reset Support Request - ${new Date().toLocaleString("en-GB")}`,
            });
        },
    },
    plugins: [twoFactor()],
    user: {
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
                    type: { name: "Last updated", value: "$updatedAt" },
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
