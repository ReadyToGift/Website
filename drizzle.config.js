import { CF_ACCOUNT_ID, D1_TOKEN, DB_ID } from "astro:env/server";

export default {
    schema: "./src/schema.js",
    out: "./migrations",
    dialect: "sqlite",
    driver: "d1-http",
    dbCredentials: {
        databaseId: DB_ID,
        token: D1_TOKEN,
        accountId: CF_ACCOUNT_ID,
    },
};
