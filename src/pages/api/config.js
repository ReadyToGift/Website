import {
    AUTOFILL_FREE_ALLOWANCE,
    CLOUDFLARE_R2_ENDPOINT,
    ENABLE_BILLING,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_ITEMS_PER_LIST,
    FREE_TIER_PRIVATE_LIST_LIMIT,
    FREE_TIER_PUBLIC_LIST_LIMIT,
    SENTRY_DSN,
    UMAMI_DOMAINS,
    UMAMI_ID,
    UMAMI_URL,
} from "astro:env/server";
import { localImageBaseUrl } from "@/storage";

export const prerender = false;

export const GET = () =>
    new Response(
        JSON.stringify({
            enableBilling: ENABLE_BILLING,
            freeTierPublicListLimit: FREE_TIER_PUBLIC_LIST_LIMIT,
            freeTierPrivateListLimit: FREE_TIER_PRIVATE_LIST_LIMIT,
            freeTierItemsPerList: FREE_TIER_ITEMS_PER_LIST,
            freeTierEnableAutofill: FREE_TIER_ENABLE_AUTOFILL,
            autofillFreeAllowance: AUTOFILL_FREE_ALLOWANCE,
            imageBaseUrl: localImageBaseUrl ?? CLOUDFLARE_R2_ENDPOINT ?? null,
            umamiUrl: UMAMI_URL ?? null,
            umamiId: UMAMI_ID ?? null,
            umamiDomains: UMAMI_DOMAINS ?? null,
            sentryDsn: SENTRY_DSN ?? null,
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        },
    );
