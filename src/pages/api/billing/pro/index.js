import { POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } from "astro:env/server";
import { createSessionClient } from "@/server/appwrite";
import { Polar } from "@polar-sh/sdk";

import { getCache, setCache } from "@/server/cache";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

export const GET = async () => {
    try {
        let prices = await getCache("proPrices");

        if (!prices) {
            const result = await polar.products.get({
                id: POLAR_PRO_PRODUCT_ID
            });

            prices = result.prices.filter((price) => !price.isArchived);

            await setCache("proPrices", prices, 60 * 60 * 1000); // Cache for 1 hour
        }

        if (!prices || prices.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "No active prices found for Pro product"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                price: prices[0]
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.log(err);
        console.error(`Request failed fetching pro price: ${err.message}`);
        return new Response(
            JSON.stringify({
                error: "Request failed"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
};
