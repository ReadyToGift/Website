import { ENABLE_BILLING } from "astro:env/server";
import { getWeddingProduct } from "@/server/billing";

export const prerender = false;

export const GET = async () => {
    try {
        if (!ENABLE_BILLING) {
            return new Response(
                JSON.stringify({ error: "Billing is disabled" }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const product = await getWeddingProduct();
        const prices = product.prices.filter((price) => !price.is_archived);

        if (!prices.length) {
            return new Response(
                JSON.stringify({
                    error: "No active prices found for Wedding product",
                }),
                {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        return new Response(
            JSON.stringify({ success: true, product: { price: prices[0] } }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        if (error.message === "Wedding product ID is not configured") {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        console.error(
            `Request failed fetching wedding price: ${error.message}`,
        );
        return new Response(JSON.stringify({ error: "Request failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
