import { getCache, setCache } from "@/server/cache";
import { createAdminClient, createSessionClient } from "@/server/appwrite";
import { extractJwt } from "@/server/auth";

import { getCustomerSession, getCustomerSubscriptions, getLimitsForCustomer } from "@/server/billing";

export const GET = async (context) => {
    try {
        let account;
        let sessionClient;
        try {
            const jwt = extractJwt(context);
            account = await getCache(`jwt:${jwt}`);

            if (!account ) {
                sessionClient = createSessionClient(context);
                account = await sessionClient.account.get();
                if (account) {
                    await setCache(`jwt:${jwt}`, account, 5 * 60 * 1000);
                }
            }
        } catch (error) {
            console.error("Error getting account", error);
            
            return new Response(
                JSON.stringify({
                    message: "Internal server error when getting account"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const [customerSession, subscriptions] = await Promise.all([
            getCustomerSession({ externalCustomerId: account.$id }),
            getCustomerSubscriptions({ externalCustomerId: account.$id })
        ]);

        const limits = await getLimitsForCustomer({ customerId: customerSession.customerId });

        const hasPro = subscriptions.some(sub => sub.status === "active");

        if (hasPro !== account.prefs.pro) {
            try {
                sessionClient.account.updatePrefs({
                    ...account.prefs,
                    pro: hasPro
                });
                console.log("Updated account prefs to match subscription status");
            } catch (error) {
                console.error("Error updating account prefs", error);
            }
        }

        return new Response(
            JSON.stringify({
                customerSession,
                subscriptions,
                limits
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