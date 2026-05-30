import { appwriteErrorResponse, createSessionClient } from "@/server/appwrite";
import { POLAR_ACCESS_TOKEN, POLAR_PRO_PRODUCT_ID } from "astro:env/server";
import { ENABLE_BILLING } from "astro:env/client";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

const toPolarExternalCustomerId = (id) => {
    if (!id) return id;
    return id.startsWith("appwrite:") ? id : `appwrite:${id}`;
};


export const POST = async (context) => {
    try {
        if (!ENABLE_BILLING) {
            return new Response(
                JSON.stringify({
                    message: "Billing is disabled"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

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
                externalCustomerId: toPolarExternalCustomerId(account.$id),
                products: [
                    POLAR_PRO_PRODUCT_ID
                ],
                successUrl: websiteDomain + "/api/billing/pro/checkout/success",
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
        const resp = appwriteErrorResponse?.(error, "Appwrite backend is unavailable");
        if (resp) return resp;
        return new Response(null, {
            status: 500
        });
    }
};