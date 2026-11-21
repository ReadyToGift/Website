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
export const db = database;
export const localImageBaseUrl = null;
export const getEnv = (key) => env[key];
export { waitUntil };
