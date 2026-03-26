import { computed, map } from "nanostores";
import { $prefs } from "./prefs";
import { getJwt } from "./auth";
import { userLists } from "./userLists";

import {
    ENABLE_BILLING,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_ITEMS_PER_LIST,
    FREE_TIER_PRIVATE_LIST_LIMIT,
    FREE_TIER_PUBLIC_LIST_LIMIT
} from "astro:env/client";

export const billing = map({
    billingLoaded: false,
    subscriptions: [],
    session: null,
    pro: null,
    inactiveSubscription: null
});

export const limits = map({
    publicLists: FREE_TIER_PUBLIC_LIST_LIMIT,
    privateLists: FREE_TIER_PRIVATE_LIST_LIMIT,
    itemsPerList: FREE_TIER_ITEMS_PER_LIST,
    autofill: FREE_TIER_ENABLE_AUTOFILL
});

export const allLimits = map({
    free: limits.get(),
    pro: limits.get()
});

export const getBillingDetails = async () => {
    if (!ENABLE_BILLING) {
        console.log("Billing is disabled, using free limits");
        billing.setKey("billingLoaded", true);
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
        billing.setKey("billingLoaded", true);
        return true;
    } catch {
        billing.setKey("billingLoaded", true);

        return false;
    }
};

export const init = async () => {
    try {
        const allLimitsResp = await fetch("/api/billing/limits");
        const allLimitsData = await allLimitsResp.json();
    
        let newLimits = $prefs.get().pro ? 
            allLimitsData.pro :
            allLimitsData.free;
        
        allLimits.setKey("free", allLimitsData.free);
        
        if (ENABLE_BILLING) {
            allLimits.setKey("pro", allLimitsData.pro);
        }
    
        limits.setKey("publicLists", newLimits.publicLists);
        limits.setKey("privateLists", newLimits.privateLists);
        limits.setKey("itemsPerList", newLimits.itemsPerList);
        limits.setKey("autofill", newLimits.autofill);
    } catch (error) {
        console.log(error);
    }
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

export const privateListLimitReached = computed([limits, userLists], (limitsState, userListsState) => {
    if (limitsState.privateLists === -1) {
        return false;
    }
    return limitsState.privateLists <= (userListsState.listCount?.private || 0);
});


export default {
    billing,
    limits,
    init,
    getProCheckout,
    getProProduct,
    publicListLimitReached
};
