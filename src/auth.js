import { env, waitUntil } from "cloudflare:workers";
import { passkey } from "@better-auth/passkey";
import { checkout, polar, portal, usage } from "@polar-sh/better-auth";
import { createPolarCore } from "@polar-sh/sdk/2026-10";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, twoFactor } from "better-auth/plugins";
import * as schema from "@/auth-schema";
import { db } from "@/db";
import { deleteCache, getCache, setCache } from "@/server/cache";
import { sendEmail } from "@/utils/email/index";

const ENABLE_BILLING = String(env.ENABLE_BILLING) === "true";
const BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET;

if (!BETTER_AUTH_SECRET) throw new Error("Missing BETTER_AUTH_SECRET");

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

const plugins = [
    twoFactor(),
    magicLink({
        sendMagicLink: async ({ email, url }) => {
            console.log("Sending magic link to", email);

            const body = `You requested a magic link.<br/>
                Click the link below to sign in.<br/><br/>
                <a href="${url}">${url}</a>`;
            const footer = `If you didn't request this, you can ignore this email.`;
            return sendEmail({
                to: email,
                name: email,
                subject: "Sign in link",
                preview: "You requested a sign in link",
                body,
                footer,
                contactSupportDefaultSubject: `Sign in link - ${new Date().toLocaleString("en-GB")}`,
            });
        },
    }),
    passkey({
        registration: {
            requireSession: true,
        },
    }),
];

if (ENABLE_BILLING) {
    const polarClient = createPolarCore({
        accessToken: env.POLAR_ACCESS_TOKEN,
    });
    plugins.push(
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
                checkout({
                    products: [
                        {
                            productId: env.POLAR_PRO_PRODUCT_ID,
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
    secret: BETTER_AUTH_SECRET,
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
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    secondaryStorage: {
        get: async (key) => await getCache(`auth:${key}`),
        set: async (key, value, ttl) =>
            await setCache(`auth:${key}`, value, ttl),
        delete: async (key) => await deleteCache(`auth:${key}`),
    },
});
