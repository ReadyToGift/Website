import { computed, map } from "nanostores";
import { create as createDialog } from "./dialogs";
import { getJwt } from "./auth";
import { userLists } from "./userLists";

import {
    ENABLE_POLAR,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_PUBLIC_LIST_LIMIT
} from "astro:env/client";

export const polar = map({
    sessionLoading: false,
    subscriptions: [],
    session: null,
    publicListLimit: FREE_TIER_PUBLIC_LIST_LIMIT,
    privateListLimit: -1,
    itemsPerListLimit: -1,
    enableAutofill: FREE_TIER_ENABLE_AUTOFILL,
    pro: null,
    inactiveSubscription: null
});

export const init = async () => {
    polar.setKey("sessionLoading", true);

    if (!ENABLE_POLAR) {
        polar.setKey("sessionLoading", false);
        return;
    }

    const jwt = await getJwt();
    if (!jwt) return console.error("Unable to get jwt for user.");

    try {
        const polarResp = await fetch("/api/billing", {
            headers: {
                "Authorization": `Bearer ${jwt}`
            }
        });
        const {
            customerSession,
            subscriptions,
            limits
        } = await polarResp.json();
    
        polar.setKey("session", customerSession);
        polar.setKey("subscriptions", subscriptions);

        polar.setKey("publicListLimit", limits.publicLists);
        polar.setKey("privateListLimit", limits.privateLists);
        polar.setKey("itemsPerListLimit", limits.itemsPerList);
        polar.setKey("enableAutofill", limits.autofill);

        const activeSubscription = subscriptions.find((sub) => sub.status === "active");
        polar.setKey("pro", activeSubscription);

        const inactiveSubscription = subscriptions.find((sub) => sub.status === "canceled");
        polar.setKey("inactiveSubscription", inactiveSubscription);
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

    polar.setKey("sessionLoading", false);
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
    getProProduct,
    publicListLimitReached
};
