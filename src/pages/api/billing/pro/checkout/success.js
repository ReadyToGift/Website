import { deleteCache } from "@/server/cache";
export const prerender = false;
import { ENABLE_BILLING } from "astro:env/client";
import { createPolar } from "@polar-sh/sdk/2026-10";
import { POLAR_ACCESS_TOKEN } from "astro:env/server";

const polar = createPolar({
    accessToken: POLAR_ACCESS_TOKEN,
});

export const GET = async (context) => {
    if (!ENABLE_BILLING) {
        return context.redirect("/dash");
    }
    try {
        const { searchParams } = new URL(context.request.url);
        const customerSessionToken = searchParams.get("customer_session_token");

        const customerSessionPolar = createPolar({
            accessToken: customerSessionToken
        });
        const customer = await customerSessionPolar.customerPortal.customers.get();

        const customerData = await polar.customers.get(customer.id);

        await Promise.all([
            deleteCache(`polarSubscriptions:${customerData.external_id}`),
            deleteCache(`polarCustomerSession:${customerData.external_id}`),
            deleteCache(`polarBenefitGrants:${customerData.id}`)
        ]);

        return context.redirect("/dash/settings/billing?status=success");
    } catch (error) {
        console.error("Error in billing success handler", error);
        // return context.redirect("/dash/settings/billing?status=error");
        return new Response("Error processing billing success", {
            status: 500
        });
    }
};
