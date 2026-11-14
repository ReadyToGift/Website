import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "./auth-schema.js";
import * as appSchema from "./schema.js";

export const db = drizzle(env.DB, {
    schema: {
        ...appSchema,
        ...authSchema,
    },
});
