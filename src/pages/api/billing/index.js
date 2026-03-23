import { createSessionClient } from "@/server/appwrite";
import { Polar } from "@polar-sh/sdk";
import { POLAR_ACCESS_TOKEN } from "astro:env/server";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

export const GET = async (context) => {
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
        const [customerSession, subscriptionsResp] = await Promise.all([
            polar.customerSessions.create({
                externalCustomerId: account.$id
            }),
            polar.subscriptions.list({
                externalCustomerId: account.$id
            })
        ]);

        const subscriptions = subscriptionsResp.result.items;

        const benefitsResp = await polar.benefitGrants.list({
            customerId: customerSession.customerId
        });

        const benefitGrants = benefitsResp.result.items.filter((benefit) => benefit.isGranted);

        console.log({
            customerSession, 
            subscriptions,
            benefitGrants
        });

        return new Response(
            JSON.stringify({
                customerSession,
                subscriptions,
                benefitGrants
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (error) {
        console.error(error);

        return new Response(null, {
            status: 500
        });
    }
};