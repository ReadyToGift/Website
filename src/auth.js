import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import * as schema from "@/auth-schema";
import { db } from "@/db";
import { sendEmail } from "@/utils/email";

export const auth = betterAuth({
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
            await sendEmail({
                to: user.email,
                subject: "Reset Password",
                body: `Click here to reset: <a href="${url}">${url}</a>`,
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
