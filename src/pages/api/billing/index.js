export const prerender = false;

import { ENABLE_BILLING } from "astro:env/client";
import { requireAuth } from "@/auth";
import {
    ensurePolarCustomer,
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

        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;
        await ensurePolarCustomer({ user });

        const [subscriptions, autofillMeter] = await Promise.all([
            getCustomerSubscriptions({ externalCustomerId: user.id }),
            getUserAutofillMeter({ externalCustomerId: user.id }),
        ]);

        const hasPro = subscriptions.some((sub) => sub.status === "active");

        return new Response(
            JSON.stringify({
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
