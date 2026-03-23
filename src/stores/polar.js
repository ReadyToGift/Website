import { computed, map } from "nanostores";
import { create as createDialog } from "./dialogs";
import { getJwt } from "./auth";
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
            benefitGrants
        } = await polarResp.json();
    
        polar.setKey("session", customerSession);
        polar.setKey("subscriptions", subscriptions);
    
        const benefitNames = benefitGrants.map((b) => b.benefit.description);
    
        if (benefitNames.includes("Autofill")) {
            polar.setKey("enableAutofill", true);
        }
    
        if (benefitNames.includes("Unlimited Public Lists")) {
            polar.setKey("publicListLimit", -1);
        }
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

    const proCheckoutResp = await fetch("/api/billing/checkout/pro", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`
        }
    });
    const proCheckout = await proCheckoutResp.json();

    return proCheckout.url;

};

export const getProPricing = async () => {
    const response = await fetch("/api/billing/checkout/pro");
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
