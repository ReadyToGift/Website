import { defineStore } from "pinia";
import { markRaw } from "vue";
import { v7 as uuidv7 } from "uuid";

import TotpChallenge from "@/components/dialogs/account/mfa/totp/TotpChallenge.vue";

export const useDialogs = defineStore("dialogs", {
    state: () => ({
        dialogs: []
    }),
    actions: {
        close(id, actionText, data = null) {
            let dialog = this.dialogs.find((d) => d.id === id);
            if (!dialog) return;
            if (dialog.async) {
                dialog.resolvePromise({ action: actionText, data });
            }

            dialog.open = false;

            setTimeout(() => {
                delete this.dialogs[id];
            }, 500);
        },
        create(dialog) {
            let resolvePromise;
            let promise;

            if (dialog.async) {
                promise = new Promise((resolve) => {
                    resolvePromise = resolve;
                });
            }

            this.dialogs.push({ open: true, resolvePromise, id: uuidv7(), ...dialog });

            return dialog.async ? promise : null;
        },
        async createTOTPChallengeDialog() {
            return this.create({
                async: true,
                component: markRaw(TotpChallenge),
                emits: [
                    "cancel", "success", "totp-removed"
                ],
                fullscreen: false,
                maxWidth: "80%",
                title: "Multi-Factor Authentication"
            });
        }
    }
});
