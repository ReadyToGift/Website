import { ENABLE_BILLING } from "astro:env/client";
import { POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } from "astro:env/server";
import { createPolar } from "@polar-sh/sdk/2026-10";
import { requireAuth } from "@/auth";
import { ensurePolarCustomer } from "@/server/billing";

export const prerender = false;

const polar = createPolar({
    accessToken: POLAR_ACCESS_TOKEN,
});

export const POST = async (context) => {
    try {
        if (!ENABLE_BILLING) {
            return new Response(
                JSON.stringify({
                    message: "Billing is disabled",
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const { unauthorizedResponse, user: account } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;
        await ensurePolarCustomer({ account });

        const websiteDomain = new URL(context.request.url).origin;

        let checkout;

        try {
            checkout = await polar.checkouts.create({
                embed_origin: websiteDomain,
                external_customer_id: account.id,
                products: [POLAR_PRO_PRODUCT_ID],
                success_url: `${websiteDomain}/api/billing/pro/checkout/success`,
                cancel_url: `${websiteDomain}/dash/settings/billing?status=cancel`,
            });
        } catch (err) {
            console.error(err);
            return new Response(null, {
                status: 400,
            });
        }

        return new Response(
            JSON.stringify({
                url: checkout.url,
            }),
            {
                status: 200,
            },
        );
    } catch (error) {
        console.log(error);
        return new Response(null, {
            status: 500,
        });
    }
};
