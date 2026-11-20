import { computed, map } from "nanostores";
import { handleFetch } from "@/utils/handleFetch";
import { config, loadConfig } from "./config";
import { userLists } from "./userLists";

export const billing = map({
    billingLoaded: false,
    subscriptions: [],
    isPro: false,
    pro: null,
    inactiveSubscription: null,
});

const getFreeLimits = (settings = config.get()) => ({
    publicLists: settings.freeTierPublicListLimit,
    privateLists: settings.freeTierPrivateListLimit,
    itemsPerList: settings.freeTierItemsPerList,
    autofill: settings.freeTierEnableAutofill,
});

export const limits = map({
    ...getFreeLimits(),
});

export const allLimits = map({
    free: limits.get(),
    pro: limits.get(),
});

const getInitialAutofillUsage = (allowance) => ({
    totalAllowance: allowance,
    usedAllowance: 0,
    remainingAllowance: allowance,
});

export const autofillUsage = map(
    getInitialAutofillUsage(config.get().autofillFreeAllowance),
);

config.listen((settings) => {
    const freeLimits = getFreeLimits(settings);
    limits.set(freeLimits);
    allLimits.set({ free: freeLimits, pro: freeLimits });
    autofillUsage.set(getInitialAutofillUsage(settings.autofillFreeAllowance));
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
    const { enableBilling } = await loadConfig();
    if (!enableBilling) {
        console.log("Billing is disabled, using free limits");
        applyLimits({ isPro: false });
        billing.setKey("billingLoaded", true);
        return;
    }

    try {
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
