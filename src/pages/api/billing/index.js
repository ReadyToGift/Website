export const prerender = false;

import { ENABLE_BILLING } from "astro:env/client";
import { requireAuth } from "@/auth";
import {
    ensurePolarCustomer,
    getCustomerSession,
    getCustomerSubscriptions,
    getLimits,
    getProProduct,
    getUserAutofillMeter,
} from "@/server/billing";

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
                    message: "Billing is disabled",
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const { unauthorizedResponse, user: account } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;
        await ensurePolarCustomer({ account });

        const [customerSession, subscriptions, autofillMeter] =
            await Promise.all([
                getCustomerSession({ externalCustomerId: account.id }),
                getCustomerSubscriptions({ externalCustomerId: account.id }),
                getUserAutofillMeter({ externalCustomerId: account.id }),
            ]);

        const hasPro = subscriptions.some((sub) => sub.status === "active");

        return new Response(
            JSON.stringify({
                customerSession,
                subscriptions,
                autofillMeter,
                proLimits: await getProLimits(),
                pro: hasPro,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error) {
        console.error(error);

        return new Response(null, {
            status: 500,
        });
    }
};
