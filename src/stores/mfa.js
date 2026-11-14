import { markRaw } from "vue";
import TotpChallenge from "@/components/dialogs/account/mfa/totp/TotpChallenge.vue";
import { authClient } from "./auth";
import { create as createDialog } from "./dialogs";

const unwrap = async (request) => {
    const { data, error } = await request;
    if (error) throw new Error(error.message || "MFA request failed");
    return data;
};

export const createTOTPChallengeDialog = (props = {}) =>
    createDialog({
        async: true,
        component: markRaw(TotpChallenge),
        emits: ["cancel", "success", "totp-removed"],
        fullscreen: false,
        maxWidth: "500px",
        props,
        title: "Multi-Factor Authentication",
    });

export const completeMFAchallenge = (code, factor = "totp") =>
    unwrap(
        factor === "recoverycode"
            ? authClient.twoFactor.verifyBackupCode({ code })
            : authClient.twoFactor.verifyTotp({ code }),
    );

export const enableMFA = (password) =>
    unwrap(authClient.twoFactor.enable({ method: "totp", password }));

export const disableMFA = (password) =>
    unwrap(authClient.twoFactor.disable({ password }));

export const regenerateRecoveryCodes = async () =>
    (await unwrap(authClient.twoFactor.generateBackupCodes())).backupCodes;

// Better Auth does not expose existing backup codes to the client. This
// intentionally generates a fresh set after the user has re-authenticated.
export const getRecoveryCodes = async () => {
    const response = await fetch("/api/auth/mfa/recovery-codes", {
        method: "POST",
        credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.message || "Unable to retrieve recovery codes");
    }
    return result.backupCodes;
};
