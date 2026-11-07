import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/auth-schema";
import { db } from "@/db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema,
    }),
});
