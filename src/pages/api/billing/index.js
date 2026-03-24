import { createSessionClient } from "@/server/appwrite";
import { Polar } from "@polar-sh/sdk";
import { POLAR_ACCESS_TOKEN } from "astro:env/server";
import { getCache, setCache } from "@/server/cache";

const polar = new Polar({
    accessToken: POLAR_ACCESS_TOKEN
});

export const GET = async (context) => {
    try {
        let sessionClient;
        try {
            sessionClient = createSessionClient(context);
        } catch (err) {
            console.error("Error creating session client", err);

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

        let account;

        try {
            account = await getCache(`jwt:${sessionClient.jwt}`);
            if (!account ) {
                account = await sessionClient.account.get();
                if (account) {
                    await setCache(`jwt:${sessionClient.jwt}`, account, 5 * 60 * 1000);
                }
            }
        } catch (error) {
            console.error("Error getting account", error);
            
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

        const getCustomerSession = async () => {
            let session = await getCache(`polarCustomerSession:${account.$id}`);

            if (!session) {
                session = await polar.customerSessions.create({
                    externalCustomerId: account.$id
                }).catch((error) => {
                    console.log(error);
                    throw new Error("Error getting customer session", { cause: error });
                });
                await setCache(`polarCustomerSession:${account.$id}`, session, 55 * 60 * 1000);
            }

            return session;
        };

        const getCustomerSubscriptions = async () => {
            let subscriptions = await getCache(`polarSubscriptions:${account.$id}`);

            if (!subscriptions) {
                subscriptions = await polar.subscriptions.list({
                    externalCustomerId: account.$id
                }).catch((error) => {
                    console.log(error);
                    throw new Error("Error getting subscriptions", { cause: error });
                });

                subscriptions = subscriptions.result.items;
                    
                await setCache(`polarSubscriptions:${account.$id}`, subscriptions, 5 * 60 * 1000);
            }

            return subscriptions;
        };

        const [customerSession, subscriptions] = await Promise.all([
            getCustomerSession(),
            getCustomerSubscriptions()
        ]);

        let benefitGrants = await getCache(`polarBenefitGrants:${account.$id}`);

        if (!benefitGrants) {
            const benefitsResp = await polar.benefitGrants.list({
                customerId: customerSession.customerId
            }).catch((error) => {
                console.log(error);
                throw new Error("Error getting benefit grants", { cause: error });
            });
    
            const benefitGrants = benefitsResp.result.items.filter((benefit) => benefit.isGranted);

            await setCache(`polarBenefitGrants:${account.$id}`, benefitGrants, 5 * 60 * 1000);
        }


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