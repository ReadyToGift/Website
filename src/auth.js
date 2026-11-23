import {
    BETTER_AUTH_SECRET,
    DOMAIN,
    ENABLE_BILLING,
    POLAR_ACCESS_TOKEN,
    POLAR_PRO_PRODUCT_ID,
    TRUSTED_PROXY_HEADERS,
} from "astro:env/server";
import { createAuth } from "@/create-auth";

export const requireAuth = (context) => {
    const { user, session } = context.locals;
    if (!user)
        return {
            unauthorizedResponse: new Response(null, { status: 401 }),
            user: null,
            session: null,
        };

    return { unauthorizedResponse: null, user, session };
};

export const auth = createAuth({
    domain: DOMAIN,
    trustedProxyHeaders: TRUSTED_PROXY_HEADERS,
    enableBilling: ENABLE_BILLING,
    betterAuthSecret: BETTER_AUTH_SECRET,
    polarAccessToken: POLAR_ACCESS_TOKEN,
    polarProProductId: POLAR_PRO_PRODUCT_ID,
});
