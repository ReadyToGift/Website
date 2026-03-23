// @ts-check
import { defineConfig, envField } from "astro/config";

import vue from "@astrojs/vue";

import sentry from "@sentry/astro";
import vercel from "@astrojs/vercel";
import vuetify from "vite-plugin-vuetify";

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
            FREE_TIER_ENABLE_AUTOFILL: envField.boolean({
                context: "client",
                access: "public",
                default: true
            }),
            ENABLE_POLAR: envField.boolean({ context: "client", access: "public", default: false }),

            POLAR_ACCESS_TOKEN: envField.string({
                context: "server",
                access: "secret",
                optional: true
            }),
            POLAR_PRO_PRODUCT_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true
            })
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
