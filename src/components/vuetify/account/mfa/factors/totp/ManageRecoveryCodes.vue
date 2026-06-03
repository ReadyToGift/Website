<template>
    <v-list-item
        :prepend-icon="icon"
        @click="manageCodes"
    >
        {{ title }}
    </v-list-item>
</template>

<script setup>
import { markRaw } from "vue";
import { VListItem } from "vuetify/components";

import { createTOTPChallengeDialog, getRecoveryCodes,regenerateRecoveryCodes } from "@/stores/mfa";
import { create as createDialog } from "@/stores/dialogs";
    
import RecoveryCodes from "./RecoveryCodes.vue";

const props = defineProps({
    action: {
        required: true,
        type: String
    },
    icon: {
        default: null,
        required: false,
        type: String
    },
    title: {
        default: null,
        required: false,
        type: String
    }
});

const manageCodes = async () => {
    if (props.action === "regenerate") {
        const warningDialogResp = await createDialog({
            actions: [
                {
                    action: "close",
                    color: "error",
                    text: "Cancel"
                },
                {
                    action: "close",
                    color: "primary",
                    text: "Continue"
                }
            ],
            async: true,
            text: "Regenerating your recovery codes will invalidate your existing codes. Are you sure you want to continue?",
            title: "Regenerate Recovery Codes"
        });
        if (warningDialogResp.action === "Cancel") {
            return;
        }
    }

    const totpChallengeResp = await createTOTPChallengeDialog();

    if (totpChallengeResp.action === "cancel" || totpChallengeResp.action === "totp-removed") {
        return;
    }

    let recoveryCodes = [];

    if (props.action === "regenerate") {
        recoveryCodes = await regenerateRecoveryCodes();
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            component: markRaw(RecoveryCodes),
            props: {
                recoveryCodes: recoveryCodes
            },
            text: "Your recovery codes have been regenerated successfully. Make sure to store them in a safe place.",
            title: "Recovery Codes Regenerated"
        });
    } else {
        recoveryCodes = await getRecoveryCodes();
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            component: markRaw(RecoveryCodes),
            props: {
                recoveryCodes: recoveryCodes
            },
            text: "Your recovery codes have been retrieved successfully. Make sure to store them in a safe place.",
            title: "Recovery Codes Retrieved"
        });
    }

};
</script>
