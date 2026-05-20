// @ts-check
import { defineConfig, envField } from "astro/config";

import vue from "@astrojs/vue";

import sentry from "@sentry/astro";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
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
            LOGIN_METHODS: envField.string({ context: "client", access: "public", optional: true }),
            UMAMI_URL: envField.string({ context: "client", access: "public", optional: true }),
            UMAMI_ID: envField.string({ context: "client", access: "public", optional: true }),
            UMAMI_DOMAINS: envField.string({ context: "client", access: "public", optional: true }),
            SENTRY_DSN: envField.string({ context: "client", access: "public", optional: true }),
            APPWRITE_DEV_KEY: envField.string({
                context: "client",
                access: "public",
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
        },
        build: {
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        // Ensure Vue SFC styles are always extracted to separate CSS files
                        if (id.includes(".vue") && id.includes("?vue&type=style")) {
                            return "styles";
                        }
                    }
                }
            }
        }
    },

    output: "static",

    adapter: vercel()
});
