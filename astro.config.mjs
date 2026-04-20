// @ts-check
import { defineConfig, envField } from "astro/config";

import vue from "@astrojs/vue";

import sentry from "@sentry/astro";
import vercel from "@astrojs/vercel";

import node from "@astrojs/node";
let adapter;

if (process.env.VERCEL) {
    adapter = vercel();
} else {
    adapter = node({
        mode: "standalone"
    });
}

// https://astro.build/config
export default defineConfig({
    site: "https://readyto.gift",

    env: {
        schema: {
            APPWRITE_PROJECT: envField.string({ context: "client", access: "public" }),
            APPWRITE_ENDPOINT: envField.string({
                context: "client",
                access: "public",
                default: "https://cloud.appwrite.io/v1"
            }),
            APPWRITE_DB: envField.string({ context: "client", access: "public" }),
            APPWRITE_ITEM_COLLECTION: envField.string({ context: "client", access: "public" }),
            APPWRITE_LIST_COLLECTION: envField.string({ context: "client", access: "public" }),
            APPWRITE_FULFILLMENT_COLLECTION: envField.string({
                context: "client",
                access: "public"
            }),
            APPWRITE_IMAGE_BUCKET: envField.string({ context: "client", access: "public" }),
            LOGIN_METHODS: envField.string({
                context: "client",
                access: "public",
                default: "password"
            }),
            UMAMI_URL: envField.string({ context: "client", access: "public", optional: true }),
            UMAMI_ID: envField.string({ context: "client", access: "public", optional: true }),
            UMAMI_DOMAINS: envField.string({ context: "client", access: "public", optional: true }),
            SENTRY_DSN: envField.string({ context: "client", access: "public", optional: true }),
            APPWRITE_DEV_KEY: envField.string({
                context: "client",
                access: "public",
                optional: true
            }),
            APPWRITE_KEY: envField.string({ context: "server", access: "secret" }),
            FREE_TIER_PUBLIC_LIST_LIMIT: envField.number({
                context: "client",
                access: "public",
                default: -1
            }),
            FREE_TIER_PRIVATE_LIST_LIMIT: envField.number({
                context: "client",
                access: "public",
                default: -1 
            }),
            FREE_TIER_ITEMS_PER_LIST: envField.number({
                context: "client",
                access: "public",
                default: -1
            }),
            FREE_TIER_ENABLE_AUTOFILL: envField.boolean({
                context: "client",
                access: "public",
                default: true
            }),
            AUTOFILL_FREE_ALLOWANCE: envField.number({ context: "client", access: "public", default: 5 }),
            ENABLE_BILLING: envField.boolean({ context: "client", access: "public", default: false }),

            POLAR_ACCESS_TOKEN: envField.string({
                context: "server",
                access: "secret",
                optional: true
            }),
            POLAR_AUTOFILL_METER_ID: envField.string({ context: "server", access: "secret", optional: true }),
            POLAR_PRO_PRODUCT_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true
            }),
            REDIS_HOST: envField.string({
                context: "server",
                access: "secret",
                optional: true
            }),
            FLUSH_CACHE_ON_START: envField.boolean({
                context: "server",
                access: "secret",
                default: false // TODO: May need to be updated
            }),

            AUTOFILL_USE_LOCAL_FETCH: envField.boolean({ context: "server", access: "secret", default: false }),
            AUTOFILL_HTTP_PROXIES: envField.string({ context: "server", access: "secret", optional: true }),
            AUTOFILL_PROXY_USERNAME: envField.string({ context: "server", access: "secret", optional: true }),
            AUTOFILL_PROXY_COUNTRY_PREFIX: envField.string({ context: "server", access: "secret", optional: true }),
            AUTOFILL_PROXY_PASSWORD: envField.string({ context: "server", access: "secret", optional: true }),
            AUTOFILL_PROXY_HOST: envField.string({ context: "server", access: "secret", optional: true }),
            AUTOFILL_PROXY_ATTEMPTS: envField.number({ context: "client", access: "public", default: 3 })
            


            
        }
    },

    integrations: [
        vue({
            appEntrypoint: "/src/pages/_app"
        }),
        sentry()
    ],

    vite: {
        ssr: {
            noExternal: ["vuetify"]
        }
    },

    output: "server",

    adapter
});
