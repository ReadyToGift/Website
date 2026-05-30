import { getCache, setCache } from "@/server/cache";
export const prerender = false;
import { createSessionClient } from "@/server/appwrite";
import { extractJwt } from "@/server/auth";

import { getCustomerSession, getCustomerSubscriptions, getLimits, getProProduct, getUserAutofillMeter } from "@/server/billing";

import { ENABLE_BILLING } from "astro:env/client";

const getProLimits = async () => {
    if (!ENABLE_BILLING) {
        return getLimits([]);
    }

    const proProduct = await getProProduct();
    const benefitNames = proProduct.benefits.map((b) => b.description);
    return getLimits(benefitNames);
};

export const GET = async (context) => {
    try {
        if (!ENABLE_BILLING) {
            return new Response(
                JSON.stringify({
                    message: "Billing is disabled"
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let account;
        let sessionClient;
        try {
            const jwt = extractJwt(context);
            account = await getCache(`jwt:${jwt}`);

            sessionClient = createSessionClient(context);
            account = await sessionClient.account.get();
            if (account) {
                await setCache(`jwt:${jwt}`, account, 5 * 60 * 1000);
            }
        } catch (error) {
            console.error("Error getting account", error);
            
            return new Response(
                JSON.stringify({
                    message: "Internal server error when getting account"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const [customerSession, subscriptions, autofillMeter] = await Promise.all([
            getCustomerSession({ externalCustomerId: account.$id }),
            getCustomerSubscriptions({ externalCustomerId: account.$id }),
            getUserAutofillMeter({ externalCustomerId: account.$id })
        ]);

        const hasPro = subscriptions.some(sub => sub.status === "active");

        return new Response(
            JSON.stringify({
                customerSession,
                subscriptions,
                autofillMeter,
                proLimits: await getProLimits(),
                pro: hasPro
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (error) {
        console.error(error);

        return new Response(null, {
            status: 500
        });
    }
};