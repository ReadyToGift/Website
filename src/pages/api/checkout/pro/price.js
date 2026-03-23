import { POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } from "astro:env/server";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

const prices = [
    {
        createdAt: "2025-11-30T12:19:01.090Z",
        modifiedAt: null,
        id: "415a0cde-ea2e-45a3-a1ff-7447897862f8",
        source: "catalog",
        amountType: "fixed",
        isArchived: false,
        productId: "44d4f00e-df0e-43f4-ae41-0ab4e76069e8",
        type: "recurring",
        recurringInterval: "year",
        priceCurrency: "usd",
        priceAmount: 1499
    }
];

export const GET = async () => {
    try {
        // TODO: Remove
        // Hardcoded while developing on rubbish connection
        // const result = await polar.products.get({
        //     id: POLAR_PRO_PRODUCT_ID
        // });

        // const prices = result.prices.filter((price) => !price.isArchived);

        if (prices.length === 0) {
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
