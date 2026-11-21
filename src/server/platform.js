import { env, waitUntil } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as authSchema from "@/auth-schema.js";
import * as appSchema from "@/schema.js";

const binding = env.DB;
const database = drizzle(binding, {
    schema: {
        ...authSchema,
        ...appSchema,
    },
});

export const bucket = env.BUCKET;
export const cache = env.CACHE;
export const rateLimiter = env.API_RATE_LIMITER;
export const reportRateLimiter = env.REPORT_RATE_LIMITER;
export const autofillRateLimiter = env.AUTOFILL_RATE_LIMITER;
export const consumeRateLimit = undefined;
export const db = database;
export const localImageBaseUrl = null;
export const getEnv = (key) => env[key];
export { waitUntil };
