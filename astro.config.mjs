// @ts-check
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vue from "@astrojs/vue";
import { defineConfig, envField } from "astro/config";
import vuetifyPlugin from "vite-plugin-vuetify";

const vuetifyPlugins = vuetifyPlugin({ autoImport: true, styles: "sass" }).map(
    (plugin) =>
        plugin.name === "vuetify:import"
            ? { ...plugin, enforce: "post" }
            : plugin,
);

import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import sentry from "@sentry/astro";

const isCloudflare = process.env.CLOUDFLARE === "true";
const domain = process.env.DOMAIN || "readyto.gift";
const allowedDomains =
    process.env.ALLOWED_DOMAINS?.split(",") ||
    (process.env.DOMAIN
        ? [process.env.DOMAIN]
        : ["readyto.gift", "*.readyto.gift"]);

const buildCommit =
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA ||
    (() => {
        try {
            return execFileSync("git", ["rev-parse", "HEAD"], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            }).trim();
        } catch {
            return "unknown";
        }
    })();

// https://astro.build/config
export default defineConfig({
    site: `https://${domain}`,
    adapter: isCloudflare
        ? cloudflare({
              sessionKVBindingName: "SESSION",
          })
        : node({
              mode: "standalone",
          }),

    devToolbar: {
        enabled: false,
    },

    security: {
        allowedDomains: allowedDomains.map((d) => ({
            hostname: d,
            protocol: "https",
        })),
    },

    env: {
        schema: {
            CLOUDFLARE: envField.boolean({
                context: "server",
                access: "secret",
                default: isCloudflare,
            }),
            UMAMI_URL: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            UMAMI_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            UMAMI_DOMAINS: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            SENTRY_DSN: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            FREE_TIER_PUBLIC_LIST_LIMIT: envField.number({
                context: "server",
                access: "secret",
                default: -1,
            }),
            FREE_TIER_PRIVATE_LIST_LIMIT: envField.number({
                context: "server",
                access: "secret",
                default: -1,
            }),
            FREE_TIER_ITEMS_PER_LIST: envField.number({
                context: "server",
                access: "secret",
                default: -1,
            }),
            FREE_TIER_ENABLE_AUTOFILL: envField.boolean({
                context: "server",
                access: "secret",
                default: true,
            }),
            AUTOFILL_FREE_ALLOWANCE: envField.number({
                context: "server",
                access: "secret",
                default: 0,
            }),
            ENABLE_BILLING: envField.boolean({
                context: "server",
                access: "secret",
                default: false,
            }),

            BETTER_AUTH_SECRET: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            POLAR_ACCESS_TOKEN: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            POLAR_AUTOFILL_METER_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            POLAR_PRO_PRODUCT_ID: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),

            AUTOFILL_USE_LOCAL_FETCH: envField.boolean({
                context: "server",
                access: "secret",
                default: false,
            }),
            AUTOFILL_HTTP_PROXIES: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            AUTOFILL_PROXY_USERNAME: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            AUTOFILL_PROXY_COUNTRY_PREFIX: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            AUTOFILL_PROXY_PASSWORD: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            AUTOFILL_PROXY_HOST: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            AUTOFILL_PROXY_ATTEMPTS: envField.number({
                context: "server",
                access: "secret",
                default: 3,
            }),
            BUILD_COMMIT: envField.string({
                context: "server",
                access: "public",
                default: buildCommit,
            }),

            CLOUDFLARE_R2_ENDPOINT: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            PLUNK_BASE_URL: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            PLUNK_SECRET_KEY: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
            PLUNK_SENDING_EMAIL: envField.string({
                context: "server",
                access: "secret",
                optional: true,
            }),
        },
    },

    integrations: [
        vue({
            appEntrypoint: "/src/pages/_app",
        }),
        sentry({
            telemetry: false,
            sourcemaps: {
                disable: !process.env.SENTRY_AUTH_TOKEN,
            },
        }),
    ],

    vite: {
        plugins: [...vuetifyPlugins],
        optimizeDeps: {
            exclude: ["vuetify", "vite-plugin-vuetify"],
        },
        resolve: {
            alias: isCloudflare
                ? {}
                : {
                      "@/server/platform": fileURLToPath(
                          new URL(
                              "./src/server/platform.node.js",
                              import.meta.url,
                          ),
                      ),
                  },
            noExternal: [/^vuetify/, /^vite-plugin-vuetify/],
        },
        ssr: {
            noExternal: ["vuetify", "vite-plugin-vuetify"],
        },
        build: {},
    },

    output: "static",
});
