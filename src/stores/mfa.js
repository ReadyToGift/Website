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