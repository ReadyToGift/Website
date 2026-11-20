import { atom } from "nanostores";
import { handleFetch } from "../utils/handleFetch.js";

const defaults = {
    enableBilling: false,
    freeTierPublicListLimit: -1,
    freeTierPrivateListLimit: -1,
    freeTierItemsPerList: -1,
    freeTierEnableAutofill: true,
    autofillFreeAllowance: 0,
    imageBaseUrl: null,
    umamiUrl: null,
    umamiId: null,
    umamiDomains: null,
    sentryDsn: null,
};

export const config = atom(defaults);

let configRequest;

export const loadConfig = () => {
    configRequest ??= handleFetch("/api/config").then(([settings, error]) => {
        if (error) {
            console.error("Failed to load app configuration:", error);
            return config.get();
        }

        const value = { ...defaults, ...settings };
        config.set(value);
        return value;
    });
    return configRequest;
};
