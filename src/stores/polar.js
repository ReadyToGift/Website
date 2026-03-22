import { computed, map } from "nanostores";
import { functions } from "@/appwrite";
import { Polar } from "@polar-sh/sdk";
import { userLists } from "./userLists";

import {
    ENABLE_POLAR,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_PUBLIC_LIST_LIMIT
} from "astro:env/client";

const polarClient = new Polar();

export const polar = map({
    sessionLoading: false,
    subscriptions: [],
    session: null,
    publicListLimit: FREE_TIER_PUBLIC_LIST_LIMIT,
    enableAutofill: FREE_TIER_ENABLE_AUTOFILL
});

export const init = async () => {
    polar.setKey("sessionLoading", true);

    if (!ENABLE_POLAR) {
        polar.setKey("sessionLoading", false);
        return;
    }

    const polarSession = await functions.createExecution({
        functionId: "690fc8f4002cff45eddc",
        async: false
    });

    if (polarSession.status === "completed") {
        const responseData = JSON.parse(polarSession.responseBody);
        const session = responseData.customerSession;
        polar.setKey("session", session);

        const benefits = await polarClient.customerPortal.benefitGrants.list(
            {
                customerSession: session.token
            },
            {}
        );

        const benefitNames = benefits.result.items.map((b) => b.benefit.description);

        if (benefitNames.includes("Autofill")) {
            polar.setKey("enableAutofill", true);
        }

        if (benefitNames.includes("Unlimited Public Lists")) {
            polar.setKey("publicListLimit", -1);
        }
    } else {
        console.error("Failed to retrieve Polar session");
    }

    polar.setKey("sessionLoading", false);
};

export const getProCheckout = async () => {
    const checkout = await functions.createExecution({
        functionId: "690fc8f4002cff45eddd",
        async: false
    });

    if (checkout.status === "completed") {
        console.log("Polar Pro checkout URL:", checkout.responseBody);
        return JSON.parse(checkout.responseBody).checkoutUrl;
    }

    throw new Error("Failed to retrieve Polar Pro checkout URL");
};

export const getProPricing = async () => {
    const response = await fetch("/api/checkout/pro/price");
    const data = await response.json();

    if (data.success) {
        return data.price;
    } else {
        throw new Error(data.error || "Failed to fetch Pro pricing");
    }
};

export const getSubscriptions = async () => {
    const state = polar.get();
    if (!state.session) {
        throw new Error("Polar session not initialized");
    }

    const subscriptions = await polarClient.customerPortal.subscriptions.list(
        {
            customerSession: state.session.token
        },
        {}
    );

    if (subscriptions.result.pagination.totalCount === 0) {
        polar.setKey("subscriptions", []);
        polar.setKey("sessionLoading", false);
        return;
    }

    polar.setKey("subscriptions", subscriptions.result.items);
};

export const publicListLimitReached = computed([polar, userLists], (polarState, userListsState) => {
    if (polarState.publicListLimit === -1) {
        return false;
    }
    return polarState.publicListLimit <= (userListsState.listCount?.public || 0);
});

export default {
    polar,
    init,
    getProCheckout,
    getProPricing,
    getSubscriptions,
    publicListLimitReached
};
