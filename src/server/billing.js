import {
    ENABLE_BILLING,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_ITEMS_PER_LIST,
    FREE_TIER_PRIVATE_LIST_LIMIT,
    FREE_TIER_PUBLIC_LIST_LIMIT,
} from "astro:env/client";
import {
    POLAR_ACCESS_TOKEN,
    POLAR_AUTOFILL_METER_ID,
    POLAR_PRO_PRODUCT_ID,
} from "astro:env/server";
import { createPolar } from "@polar-sh/sdk/2026-10";
import { getCache, setCache } from "@/server/cache";

const polar = createPolar({
    accessToken: POLAR_ACCESS_TOKEN,
});

export const ensurePolarCustomer = async ({ account }) => {
    const externalId = account.id;
    try {
        return await polar.customers.getExternal(externalId);
    } catch {
        // console.log("Customer not found, creating new one");
        // return polar.customers.create({
        //     email: account.email,
        //     external_id: externalId,
        //     name: account.name,
        // });
    }
};

export const getLimits = (benefitNames) => {
    const limits = {
        publicLists: FREE_TIER_PUBLIC_LIST_LIMIT,
        privateLists: FREE_TIER_PRIVATE_LIST_LIMIT,
        itemsPerList: FREE_TIER_ITEMS_PER_LIST,
        autofill: FREE_TIER_ENABLE_AUTOFILL,
    };

    benefitNames.forEach((benefit) => {
        const desc = benefit.toLowerCase();

        if (desc.includes("autofill")) {
            limits.autofill = true;
        }

        // ensure that pro is never worse off than free
        const publicListMatch = desc.match(/(\d+)\s*public lists/);
        if (publicListMatch) {
            limits.publicLists =
                publicListMatch[1] === "unlimited"
                    ? -1
                    : Math.max(
                          limits.publicLists,
                          parseInt(publicListMatch[1], 10),
                      );
        }

        const privateListMatch = desc.match(/(\d+)\s*private lists/);
        if (privateListMatch) {
            limits.privateLists =
                privateListMatch[1] === "unlimited"
                    ? -1
                    : Math.max(
                          limits.privateLists,
                          parseInt(privateListMatch[1], 10),
                      );
        }

        const itemsPerListMatch = desc.match(/(\d+)\s*items per list/);
        if (itemsPerListMatch) {
            limits.itemsPerList =
                itemsPerListMatch[1] === "unlimited"
                    ? -1
                    : Math.max(
                          limits.itemsPerList,
                          parseInt(itemsPerListMatch[1], 10),
                      );
        }
    });

    return limits;
};

export const getCustomerId = async ({ externalCustomerId }) => {
    const customer = await polar.customers
        .getExternal(externalCustomerId)
        .catch((error) => {
            console.log(error);
            throw new Error("Error getting customer", { cause: error });
        });

    return customer.id;
};

export const getLimitsForCustomer = async ({ customerId }) => {
    const benefitGrants = await getBenefitGrants({ customerId });
    const benefitNames = benefitGrants.map(
        (benefit) => benefit.benefit.description,
    );
    return getLimits(benefitNames);
};

export const getCustomerSubscriptions = async ({ externalCustomerId }) => {
    let subscriptions = await getCache(
        `polarSubscriptions:${externalCustomerId}`,
    );

    if (!subscriptions) {
        subscriptions = await polar.subscriptions
            .list({
                external_customer_id: externalCustomerId,
            })
            .catch((error) => {
                console.log(error);
                throw new Error("Error getting subscriptions", {
                    cause: error,
                });
            });

        subscriptions = subscriptions.items;

        await setCache(
            `polarSubscriptions:${externalCustomerId}`,
            subscriptions,
            1 * 60 * 1000,
        );
    }

    return subscriptions;
};

export const getCustomerSession = async ({ externalCustomerId }) => {
    let session = await getCache(`polarCustomerSession:${externalCustomerId}`);

    if (!session) {
        session = await polar.customerSessions
            .create({
                external_customer_id: externalCustomerId,
            })
            .catch((error) => {
                console.log(error);
                throw new Error("Error getting customer session", {
                    cause: error,
                });
            });
        await setCache(
            `polarCustomerSession:${externalCustomerId}`,
            session,
            55 * 60 * 1000,
        );
    }

    return session;
};

export const getBenefitGrants = async ({ customerId }) => {
    let benefitGrants = await getCache(`polarBenefitGrants:${customerId}`);

    if (!benefitGrants) {
        const benefitsResp = await polar.benefitGrants
            .list({
                customer_id: customerId,
            })
            .catch((error) => {
                console.log(error);
                throw new Error("Error getting benefit grants", {
                    cause: error,
                });
            });

        benefitGrants = benefitsResp.items.filter(
            (benefit) => benefit.is_granted,
        );

        await setCache(
            `polarBenefitGrants:${customerId}`,
            benefitGrants,
            1 * 60 * 1000,
        );
    }

    return benefitGrants;
};

export const getUserAutofillMeter = async ({ externalCustomerId }) => {
    let autofillMeter = await getCache(
        `polarCustomerAutofillMeter:${externalCustomerId}`,
    );

    if (!autofillMeter) {
        const metersResp = await polar.customerMeters
            .list({
                external_customer_id: externalCustomerId,
                meter_id: POLAR_AUTOFILL_METER_ID,
            })
            .catch((error) => {
                console.log(error);
                throw new Error("Error getting autofill meter", {
                    cause: error,
                });
            });

        autofillMeter = metersResp.items[0];

        await setCache(
            `polarCustomerAutofillMeter:${externalCustomerId}`,
            autofillMeter,
            60 * 1000,
        );
    }

    return autofillMeter;
};

export const getProProduct = async () => {
    const product = await getCache(`polarProduct:${POLAR_PRO_PRODUCT_ID}`);

    if (!product) {
        const productResp = await polar.products
            .get(POLAR_PRO_PRODUCT_ID)
            .catch((error) => {
                console.log(error);
                throw new Error("Error getting product", { cause: error });
            });

        await setCache(
            `polarProduct:${POLAR_PRO_PRODUCT_ID}`,
            productResp,
            15 * 60 * 1000,
        );
        return productResp;
    }

    return product;
};

export const getActiveSubscription = async ({ externalCustomerId }) => {
    const subscriptions = await getCustomerSubscriptions({
        externalCustomerId,
    });
    return subscriptions.find((sub) => sub.status === "active");
};

export const getUserLimits = async ({ account }) => {
    try {
        if (!ENABLE_BILLING) {
            return {
                limits: getLimits([]),
            };
        }

        const customer = await ensurePolarCustomer({ account });
        const customerId = customer.id;
        const limits = await getLimitsForCustomer({ customerId });
        return { limits };
    } catch (err) {
        console.log(err);

        throw new Error("Error getting user limits", { cause: err });
    }
};
