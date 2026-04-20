import { computed, map } from "nanostores";
import { getJwt } from "./auth";
import { userLists } from "./userLists";

import {
    AUTOFILL_FREE_ALLOWANCE,
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
    isPro: false,
    pro: null,
    inactiveSubscription: null
});

const getFreeLimits = () => ({
    publicLists: FREE_TIER_PUBLIC_LIST_LIMIT,
    privateLists: FREE_TIER_PRIVATE_LIST_LIMIT,
    itemsPerList: FREE_TIER_ITEMS_PER_LIST,
    autofill: FREE_TIER_ENABLE_AUTOFILL
});

export const limits = map({
    ...getFreeLimits()
});

export const allLimits = map({
    free: limits.get(),
    pro: limits.get()
});

export const autofillUsage = map({
    totalAllowance: AUTOFILL_FREE_ALLOWANCE,
    usedAllowance: 0,
    remainingAllowance: AUTOFILL_FREE_ALLOWANCE
});

export const setUsedAutofillAllowance = (used) => {
    const total = autofillUsage.get().totalAllowance;
    const remaining = total - used;

    autofillUsage.setKey("usedAllowance", used);
    autofillUsage.setKey("remainingAllowance", remaining);
};

const applyLimits = ({ isPro, proLimits }) => {
    const freeLimits = getFreeLimits();
    const resolvedProLimits = proLimits || freeLimits;
    const activeLimits = isPro ? resolvedProLimits : freeLimits;

    allLimits.setKey("free", freeLimits);
    allLimits.setKey("pro", resolvedProLimits);

    limits.setKey("publicLists", activeLimits.publicLists);
    limits.setKey("privateLists", activeLimits.privateLists);
    limits.setKey("itemsPerList", activeLimits.itemsPerList);
    limits.setKey("autofill", activeLimits.autofill);

    if (activeLimits.autofill) {
        autofillUsage.setKey("totalAllowance", -1);
        autofillUsage.setKey("remainingAllowance", -1);
    }
};

export const getBillingDetails = async () => {
    if (!ENABLE_BILLING) {
        console.log("Billing is disabled, using free limits");
        applyLimits({ isPro: false });
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
            autofillMeter,
            proLimits,
            pro: isPro
        } = await billingResp.json();
    
        billing.setKey("session", customerSession);
        billing.setKey("subscriptions", subscriptions);
        billing.setKey("isPro", isPro);

        setUsedAutofillAllowance(autofillMeter.consumedUnits);

        applyLimits({ isPro, proLimits });

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
        if (!ENABLE_BILLING) {
            applyLimits({ isPro: false });
            billing.setKey("billingLoaded", true);
            return;
        }

        await getBillingDetails();
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
