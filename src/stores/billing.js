import {
    AUTOFILL_FREE_ALLOWANCE,
    ENABLE_BILLING,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_ITEMS_PER_LIST,
    FREE_TIER_PRIVATE_LIST_LIMIT,
    FREE_TIER_PUBLIC_LIST_LIMIT,
    POLAR_AUTOFILL_METER_ID,
} from "astro:env/client";
import { computed, map } from "nanostores";
import { handleFetch } from "@/utils/handleFetch";
import { authClient } from "./auth";
import { userLists } from "./userLists";

export const billing = map({
    billingLoaded: false,
    subscriptions: [],
    isPro: false,
    pro: null,
    inactiveSubscription: null,
});

const getFreeLimits = () => ({
    publicLists: FREE_TIER_PUBLIC_LIST_LIMIT,
    privateLists: FREE_TIER_PRIVATE_LIST_LIMIT,
    itemsPerList: FREE_TIER_ITEMS_PER_LIST,
    autofill: FREE_TIER_ENABLE_AUTOFILL,
});

export const limits = map({
    ...getFreeLimits(),
});

export const allLimits = map({
    free: limits.get(),
    pro: limits.get(),
});

export const autofillUsage = map({
    totalAllowance: AUTOFILL_FREE_ALLOWANCE,
    usedAllowance: 0,
    remainingAllowance: AUTOFILL_FREE_ALLOWANCE,
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

const getProLimits = (benefits = []) => {
    const proLimits = getFreeLimits();

    for (const benefit of benefits) {
        const description = String(benefit).toLowerCase();
        if (description.includes("autofill")) proLimits.autofill = true;

        for (const [key, expression] of [
            ["publicLists", /(unlimited|\d+)\s*public lists/],
            ["privateLists", /(unlimited|\d+)\s*private lists/],
            ["itemsPerList", /(unlimited|\d+)\s*items per list/],
        ]) {
            const match = description.match(expression);
            if (match) {
                proLimits[key] =
                    match[1] === "unlimited"
                        ? -1
                        : Math.max(
                              proLimits[key],
                              Number.parseInt(match[1], 10),
                          );
            }
        }
    }

    return proLimits;
};

const applyPolarState = ({ state, proProduct }) => {
    const subscriptions = state.active_subscriptions || [];
    const activeSubscription = subscriptions.find(
        (subscription) => subscription.status === "active",
    );
    const isPro = Boolean(activeSubscription);
    const product = proProduct
        ? { name: "Pro", prices: [proProduct.price] }
        : null;

    billing.setKey("subscriptions", subscriptions);
    billing.setKey("isPro", isPro);
    billing.setKey(
        "pro",
        activeSubscription ? { ...activeSubscription, product } : null,
    );
    billing.setKey("inactiveSubscription", null);
    setUsedAutofillAllowance(
        state.active_meters?.find(
            (meter) => meter.meter_id === POLAR_AUTOFILL_METER_ID,
        )?.consumed_units ?? 0,
    );
    applyLimits({ isPro, proLimits: getProLimits(proProduct?.benefits) });
    billing.setKey("billingLoaded", true);
};

export const getBillingDetails = async () => {
    console.log(ENABLE_BILLING);
    console.log(
        "Fetching billing details..." +
            (ENABLE_BILLING
                ? "Billing is enabled"
                : "Billing is disabled, using free limits"),
    );
    if (!ENABLE_BILLING) {
        console.log("Billing is disabled, using free limits");
        applyLimits({ isPro: false });
        billing.setKey("billingLoaded", true);
        return;
    }

    try {
        const [{ data: state, error: stateError }, proProduct] =
            await Promise.all([authClient.customer.state(), getProProduct()]);

        if (!stateError && state) {
            applyPolarState({ state, proProduct });
            return true;
        }

        // Migrated users may not have a Polar customer yet. This fallback
        // creates one; subsequent loads use the Better Auth Polar client.
        const [billingResp, billingError] = await handleFetch("/api/billing");
        if (billingError) throw billingError;

        const subscriptions = billingResp.subscriptions || [];
        const isPro = Boolean(billingResp.pro);
        billing.setKey("subscriptions", subscriptions);
        billing.setKey("isPro", isPro);
        billing.setKey(
            "pro",
            subscriptions.find(
                (subscription) => subscription.status === "active",
            ),
        );
        billing.setKey(
            "inactiveSubscription",
            subscriptions.find(
                (subscription) => subscription.status === "canceled",
            ),
        );
        setUsedAutofillAllowance(
            billingResp.autofillMeter?.consumed_units ?? 0,
        );
        applyLimits({ isPro, proLimits: billingResp.proLimits });
        billing.setKey("billingLoaded", true);
        return true;
    } catch (error) {
        console.error("Failed to fetch billing details:", error);
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

export const getProProduct = async () => {
    const [proProduct, proProductError] = await handleFetch("/api/billing/pro");

    if (proProductError) {
        console.error("Failed to fetch Pro product:", proProductError);
        return;
    }

    if (proProduct.success) {
        return proProduct.product;
    } else {
        throw new Error(proProduct.error || "Failed to fetch Pro pricing");
    }
};

export const refreshBilling = async () => {
    billing.setKey("billingLoaded", false);
    return getBillingDetails();
};

export const publicListLimitReached = computed(
    [limits, userLists],
    (limitsState, userListsState) => {
        if (limitsState.publicLists === -1) {
            return false;
        }
        return (
            limitsState.publicLists <= (userListsState.listCount?.public || 0)
        );
    },
);

export const privateListLimitReached = computed(
    [limits, userLists],
    (limitsState, userListsState) => {
        if (limitsState.privateLists === -1) {
            return false;
        }
        return (
            limitsState.privateLists <= (userListsState.listCount?.private || 0)
        );
    },
);

export default {
    billing,
    limits,
    init,
    getProProduct,
    refreshBilling,
    publicListLimitReached,
    privateListLimitReached,
    autofillUsage,
    setUsedAutofillAllowance,
};
