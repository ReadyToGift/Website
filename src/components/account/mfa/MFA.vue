<template>
    <v-list>
        <v-list-item
            title="Multi-Factor Authentication (MFA)"
            subtitle="Require another step after using your usual login method."
            :prepend-icon="mdiShieldCheck"
        >
            <template v-slot:append>
                <v-tooltip
                    :text="
                        hasAuthenticator
                            ? user.mfa
                                ? 'Disable MFA'
                                : 'Enable MFA'
                            : 'You need at least one MFA method enabled to use MFA.'
                    "
                    v-if="user"
                >
                    <template v-slot:activator="{ props }">
                        <div v-bind="props">
                            <v-switch
                                inset
                                color="primary"
                                hide-details
                                :disabled="!hasAuthenticator"
                                class="ml-4"
                                :model-value="user.mfa"
                                @change="toggleMFA"
                            />
                        </div>
                    </template>
                </v-tooltip>
            </template>
        </v-list-item>
        <v-list-item>
            <v-list>
                <TOTPFactor />
            </v-list>
        </v-list-item>
    </v-list>
</template>

<script setup>
import { VList, VListItem, VSwitch, VTooltip } from "vuetify/components";
import { account } from "@/appwrite";
import { computed } from "vue";
import { mdiShieldCheck } from "@mdi/js";
import TOTPFactor from "./factors/totp/TOTP.vue";

import { mfaFactors as mfaFactorsStore, user as userStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";
import { useStore } from "@nanostores/vue";

const user = useStore(userStore);
const mfaFactors = useStore(mfaFactorsStore);

const hasAuthenticator = computed(() => mfaFactors.value.totp);

const toggleMFA = async () => {
    try {
        await account.updateMFA({
            mfa: !user.mfa
        });
        userStore.set({
            ...user.value,
            mfa: !user.value.mfa
        });
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            text: `Multi-Factor Authentication has been ${user.value.mfa ? "enabled" : "disabled"}.`,
            title: "MFA Updated"
        });
    } catch (error) {
        console.error("Error toggling MFA:", error);
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            text: "There was an error updating your MFA settings. Please try again.",
            title: "Error"
        });
    }
};
</script>

<style lang="scss">
.mfa {
    > .v-card-item > .v-card-item__content {
        > .v-card-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
    }
}

.v-list-item.mfa-item {
    > .v-list-item__prepend,
    > .v-list-item__append {
        align-self: flex-start;
    }
    > .v-list-item__content > .v-card-title {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        .v-input__details {
            display: none;
        }
    }
}

.enable-mfa {
    display: flex;
}

.totp-qrcode {
    width: 12rem;
    height: 12rem;
    display: block;
    max-width: 80%;
    border-radius: 1rem;
    background-color: white;
    padding: 0.7rem;
}

/* .timeline-item-body {
    transition: max-height 0.25s ease-in-out;
    max-height: 0;
    overflow: hidden;
} */

/* .v-timeline-item[data-active="true"] .timeline-item-body {
    max-height: 200vh;
}

.recovery-codes-container {
    .recovery-codes {
        padding: 0 1rem;
        font-size: 1.2rem;
        margin: 0;
    }
}

.v-timeline-item {
    &[data-step="4"] {
        .v-otp-input {
            justify-content: flex-start;
            width: 30rem;
            font-weight: bold;
        }
    }
} */
</style>
