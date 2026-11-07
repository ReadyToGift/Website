import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import * as schema from "@/auth-schema";
import { db } from "@/db";
import { sendEmail } from "@/utils/email";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            void sendEmail({
                to: user.email,
                subject: "Reset Password",
                body: `Click here to reset: ${url}`,
            });
        },
    },
    plugins: [twoFactor()],
});
