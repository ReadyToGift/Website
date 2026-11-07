export default {
    schema: "./src/schema.js",
    out: "./migrations",
    dialect: "sqlite",
    driver: "d1-http",
    dbCredentials: {
        databaseId: process.env.CLOUDFLARE_DATABASE_ID,
        token: process.env.CLOUDFLARE_D1_TOKEN,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    },
};
