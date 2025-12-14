import { account } from "@/appwrite";
import { create as createDialog } from "./dialogs";
import { markRaw } from "vue";

import TotpChallenge from "@/components/dialogs/account/mfa/totp/TotpChallenge.vue";

export const createTOTPChallengeDialog = () => {
    return createDialog({
        async: true,
        component: markRaw(TotpChallenge),
        emits: [
            "cancel", "success", "totp-removed"
        ],
        fullscreen: false,
        maxWidth: "80%",
        title: "Multi-Factor Authentication"
    });
};

export const completeMFAchallenge = async (code, factor = "totp") => {
    return fetch("/api/auth/mfa/challenge", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ code, factor })
    });
};

export const regenerateRecoveryCodes = async () => {
    try {
        return (await account.createMFARecoveryCodes()).recoveryCodes;
    } catch (error) {
        if (error.type === "user_recovery_codes_already_exists") {
            const recoveryCodesResponse = await account.updateMFARecoveryCodes();

            return recoveryCodesResponse.recoveryCodes;
        } else {
            throw error;
        }
    }
};

export const getRecoveryCodes = async (totp) => {
    try {
        return (await account.createMFARecoveryCodes()).recoveryCodes;
    } catch (error) {
        if (error.type === "user_recovery_codes_already_exists") {
            // if no totp, there should be a recent MFA challenge to complete
            if (totp) await this.completeMFAchallenge(totp);

            const recoveryCodesResponse = await account.getMFARecoveryCodes();

            return recoveryCodesResponse.recoveryCodes;
        } else {
            throw error;
        }
    }
};