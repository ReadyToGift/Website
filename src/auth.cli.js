import { createAuth } from "./create-auth.js";

// The Better Auth CLI runs outside Astro, so astro:env is unavailable here.
export const auth = createAuth({
    enableBilling: process.env.ENABLE_BILLING === "true",
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    polarAccessToken: process.env.POLAR_ACCESS_TOKEN,
    polarProProductId: process.env.POLAR_PRO_PRODUCT_ID,
});
