import { deleteCache } from "@/server/cache";
import { ENABLE_BILLING } from "astro:env/client";
import { Polar } from "@polar-sh/sdk";
import { POLAR_ACCESS_TOKEN } from "astro:env/server";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

export const GET = async (context) => {
    if (!ENABLE_BILLING) {
        return context.redirect("/dash");
    }
    try {
        const { searchParams } = new URL(context.request.url);
        const customerSessionToken = searchParams.get("customer_session_token");

        const customer = await polar.customerPortal.customers.get({
            customerSession: customerSessionToken
        });

        const customerData = await polar.customers.get({
            id: customer.id
        });

        await Promise.all([
            deleteCache(`polarSubscriptions:${customerData.externalId}`),
            deleteCache(`polarCustomerSession:${customerData.externalId}`),
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