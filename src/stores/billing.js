import { computed, map } from "nanostores";
import { create as createDialog } from "./dialogs";
import { getJwt } from "./auth";
import { userLists } from "./userLists";

import {
    ENABLE_BILLING,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_PUBLIC_LIST_LIMIT
} from "astro:env/client";

export const billing = map({
    sessionLoading: false,
    subscriptions: [],
    session: null,
    pro: null,
    inactiveSubscription: null
});

export const limits = map({
    publicLists: FREE_TIER_PUBLIC_LIST_LIMIT,
    privateLists: -1,
    itemsPerList: -1,
    autofill: FREE_TIER_ENABLE_AUTOFILL
});

export const init = async () => {
    billing.setKey("sessionLoading", true);

    if (!ENABLE_BILLING) {
        billing.setKey("sessionLoading", false);
        return;
    }

    const jwt = await getJwt();
    if (!jwt) return console.error("Unable to get jwt for user.");

    try {
        const billingResp = await fetch("/api/billing", {
            headers: {
                "Authorization": `Bearer ${jwt}`
            }
        });
        const {
            customerSession,
            subscriptions,
            limits: newLimits
        } = await billingResp.json();
    
        billing.setKey("session", customerSession);
        billing.setKey("subscriptions", subscriptions);

        limits.setKey("publicListLimit", newLimits.publicLists);
        limits.setKey("privateListLimit", newLimits.privateLists);
        limits.setKey("itemsPerListLimit", newLimits.itemsPerList);
        limits.setKey("enableAutofill", newLimits.autofill);

        const activeSubscription = subscriptions.find((sub) => sub.status === "active");
        billing.setKey("pro", activeSubscription);

        const inactiveSubscription = subscriptions.find((sub) => sub.status === "canceled");
        billing.setKey("inactiveSubscription", inactiveSubscription);
    } catch {
        createDialog({
            title: "Error loading billing information",
            text: "Please try again later",
            actions: [
                {
                    type: "primary",
                    action: "close",
                    text: "Okay"
                }
            ]
        });
    }

    billing.setKey("sessionLoading", false);
};

export const getProCheckout = async () => {
    const jwt = await getJwt();
    if (!jwt) return console.error("Unable to get jwt for user.");

    const proCheckoutResp = await fetch("/api/billing/pro/checkout", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`
        }
    });
    const proCheckout = await proCheckoutResp.json();

    return proCheckout.url;

};

export const getProProduct = async () => {
    const response = await fetch("/api/billing/pro");
    const data = await response.json();

    if (data.success) {
        return data;
    } else {
        throw new Error(data.error || "Failed to fetch Pro pricing");
    }
};

export const publicListLimitReached = computed([limits, userLists], (limitsState, userListsState) => {
    if (limitsState.publicLists === -1) {
        return false;
    }
    return limitsState.publicLists <= (userListsState.listCount?.public || 0);
});

export default {
    billing,
    limits,
    init,
    getProCheckout,
    getProProduct,
    publicListLimitReached
};
