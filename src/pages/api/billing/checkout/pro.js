import { POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } from "astro:env/server";
import { createSessionClient } from "@/server/appwrite";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

export const POST = async (context) => {
    try {
        let sessionClient;
        try {
            sessionClient = createSessionClient(context);
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Unauthenticated"
                }),
                {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const account = await sessionClient.account.get();

        if (!account) {
            return new Response(null, {
                status: 401
            });
        };

        const websiteDomain = "http://localhost:4321";

        let checkout;

        try {
            checkout = await polar.checkouts.create({
                embedOrigin: websiteDomain,
                externalCustomerId: account.$id,
                products: [
                    POLAR_PRO_PRODUCT_ID
                ],
                successUrl: websiteDomain + "/dash/settings/billing?status=success",
                cancelUrl: websiteDomain + "/dash/settings/billing?status=cancel"
            });
        } catch (err) {
            console.error(err);
            return new Response(null, {
                status: 400
            });
        }

        return new Response(
            JSON.stringify({
                url: checkout.url
            }),
            {
                status: 200
            }
        );
    } catch (error) {
        console.log(error);
        return new Response(null, {
            status: 500
        });
    }
};

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
        priceAmount: 1500
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
