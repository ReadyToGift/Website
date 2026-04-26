import { Client, Users } from "node-appwrite";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? ""
});

const organizationId = process.env["POLAR_ORG_ID"] ?? "";
const billingEnabled = process.env["ENABLE_BILLING"] === "true";

const toPolarExternalCustomerId = (id) => {
    if (!id) return id;
    return id.startsWith("appwrite:") ? id : `appwrite:${id}`;
};

const matchesAppwriteUserId = (externalId, appwriteUserId) => {
    const normalizedUserId = toPolarExternalCustomerId(appwriteUserId);
    return externalId === appwriteUserId || externalId === normalizedUserId;
};

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
    // You can use the Appwrite SDK to interact with other services
    // For this example, we're using the Users service
    try {
        if (!billingEnabled) {
            log("Billing is disabled; skipping Polar customer sync.");
            return res.json({
                success: true,
                skipped: true
            });
        }

        const client = new Client()
            .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
            .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
            .setKey(req.headers["x-appwrite-key"] ?? "");

        const appwriteUsers = new Users(client);

        const trigger = req.headers["x-appwrite-trigger"];
        const event = req.headers["x-appwrite-event"];
        const user = req.headers["x-appwrite-user-id"];

        // manually triggered in dashboard
        if (trigger === "http") {
            const allUsers = await appwriteUsers.list();
            log(`Total users in Appwrite: ${allUsers.total}`);

            const polarCustomers = await polar.customers.list({
                organizationId
            });

            log(`Total customers in Polar: ${polarCustomers.result.items.length}`);

            for (const appwriteUser of allUsers.users) {
                const appwriteExternalId = toPolarExternalCustomerId(appwriteUser.$id);
                const existingCustomer = polarCustomers.result.items.find(
                    (c) => matchesAppwriteUserId(c.externalId, appwriteUser.$id)
                );
                if (existingCustomer) {
                    if (
                        existingCustomer.email !== appwriteUser.email ||
                        existingCustomer.name !== appwriteUser.name
                    ) {
                        try {
                            await polar.customers.updateExternal({
                                externalId: appwriteExternalId,
                                customerUpdateExternalID: {
                                    email: appwriteUser.email,
                                    name: appwriteUser.name
                                }
                            });
                            log(`Updated Polar customer for Appwrite user ${appwriteUser.$id}`);
                        } catch (err) {
                            log(
                                `Failed to update Polar customer for Appwrite user ${appwriteUser.$id}: ${err.message}`
                            );
                        }
                    } else {
                        log(`No update needed for Appwrite user ${appwriteUser.$id}`);
                    }
                } else {
                    try {
                        await polar.customers.create({
                            externalId: appwriteExternalId,
                            email: appwriteUser.email,
                            name: appwriteUser.name
                        });
                        log(`Created Polar customer for Appwrite user ${appwriteUser.$id}`);
                    } catch (err) {
                        log(
                            `Failed to create Polar customer for Appwrite user ${appwriteUser.$id}: ${err.message}`
                        );
                    }
                }
            }

            const unmatchedPolarCustomers = polarCustomers.result.items.filter((c) => {
                return !allUsers.users.find((u) => matchesAppwriteUserId(c.externalId, u.$id));
            });

            log(`Total unmatched Polar customers: ${unmatchedPolarCustomers.length}`);

            for (const polarCustomer of unmatchedPolarCustomers) {
                try {
                    await polar.customers.delete({
                        id: polarCustomer.id
                    });
                    log(`Deleted unmatched Polar customer ${polarCustomer.id}`);
                } catch (err) {
                    log(
                        `Failed to delete unmatched Polar customer ${polarCustomer.id}: ${err.message}`
                    );
                }
            }
        } else if (trigger === "event") {
            const eventType = event.split(".").pop();

            log(`Processing event type: ${eventType} for user: ${user}`);

            if (eventType === "update") {
                const appwriteUser = req.body;
                const appwriteExternalId = toPolarExternalCustomerId(appwriteUser.$id);
                await polar.customers.updateExternal({
                    externalId: appwriteExternalId,
                    customerUpdateExternalID: {
                        email: appwriteUser.email,
                        name: appwriteUser.name
                    }
                });
                log(`Updated Polar customer for Appwrite user ${appwriteUser.$id}`);
            } else if (eventType === "delete") {
                try {
                    const appwriteUser = req.body;
                    const appwriteExternalId = toPolarExternalCustomerId(appwriteUser.$id);
                    await polar.customers.deleteExternal({
                        externalId: appwriteExternalId
                    });
                    log(`Deleted Polar customer for Appwrite user ${user}`);
                } catch (err) {
                    log(
                        `Failed to delete Polar customer for Appwrite user ${user}: ${err.message}`
                    );
                }
            } else if (eventType === "create") {
                const appwriteUser = req.body;
                const appwriteExternalId = toPolarExternalCustomerId(appwriteUser.$id);
                try {
                    await polar.customers.create({
                        externalId: appwriteExternalId,
                        email: appwriteUser.email,
                        name: appwriteUser.name
                    });
                    log(`Created Polar customer for Appwrite user ${appwriteUser.$id}`);
                } catch (err) {
                    log(
                        `Failed to create Polar customer for Appwrite user ${appwriteUser.$id}: ${err.message}`
                    );
                }
            } else {
                log(`Unhandled event type: ${eventType}`);
            }
        }
        return res.json({
            success: true
        });
    } catch (err) {
        error(`Function failed: ${err.message}`);
        return res.json({
            error: "Function failed"
        });
    }
};
