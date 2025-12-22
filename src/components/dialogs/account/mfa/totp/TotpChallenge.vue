<template>
    <v-card-text>
        <template v-if="!usingRecoveryCode">
            Please enter the authentication code from your authenticator app.
            <v-otp-input
                v-model="code"
                length="6"
                type="number"
                label="Authentication Code"
                autocomplete="one-time-code"
                autofocus
                @finish="submit"
                :error="!!errorMessage"
            />
            <a
                class="text-blue font-weight-bold cursor-pointer"
                @click="usingRecoveryCode = true"
            >
                Lost your authenticator app?
            </a>
        </template>
        <template v-else>
            Please enter one of your recovery codes. If you don't have any recovery codes left, please contact support.
            <v-otp-input
                v-model="recoveryCode"
                length="10"
                type="text"
                label="Authentication Code"
                autocomplete="one-time-code"
                autofocus
                max-width="400px"
                @finish="submit"
                :error="!!errorMessage"
            />
            <a
                class="text-blue font-weight-bold cursor-pointer"
                @click="usingRecoveryCode = false"
            >
                Back to authenticator app
            </a>

            <v-alert
                type="info"
                class="mt-4"
                border="start"
                text
                width="500px"
                max-width="100%"
            >
                This will disable your multi-factor authentication. You can re-enable it later from your account settings.
            </v-alert>
        </template>
        <v-alert
            v-if="errorMessage"
            type="error"
            class="mt-4"
            border="start"
            text
            width="500px"
            max-width="100%"
        >
            {{ errorMessage }}
        </v-alert>
    </v-card-text>
    <v-card-actions>
        <v-btn
            text
            @click="$emit('cancel')"
        >
            Cancel
        </v-btn>
        <v-spacer />
        <v-btn
            color="primary"
            :disabled="code.length !== 6"
            @click="submit"
            :loading="loading"
        >
            Submit
        </v-btn>
    </v-card-actions>
</template>

<script setup>
import { mfaFactors, user } from "@/stores/auth";
import { VAlert, VBtn, VCardActions, VCardText, VOtpInput, VSpacer } from "vuetify/components";
import { account } from "@/appwrite";
import { completeMFAchallenge } from "@/stores/mfa";
import { create as createDialog } from "@/stores/dialogs";
import { shallowRef } from "vue";

const emit = defineEmits(["cancel", "success", "totp-removed"]);

const code = shallowRef("");
const recoveryCode = shallowRef("");
const errorMessage = shallowRef("");
const usingRecoveryCode = shallowRef(false);
const loading = shallowRef(false);

const submit = async () => {
    loading.value = true;
    try {
        if (usingRecoveryCode.value) {
            await completeMFAchallenge(recoveryCode.value, "recoverycode");
            await account.deleteMFAAuthenticator({
                type: "totp"
            });

            await account.updateMFA({
                mfa: false
            });

            const factors = await account.listMFAFactors();
            if (user.value) {
                mfaFactors.set(factors);
                user.set({
                    ...user.value,
                    mfa: factors.length > 0
                });
            }

            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                fullscreen: false,
                maxWidth: "90%",
                text: "Your TOTP authenticator has been successfully removed from your account. You can re-enable multi-factor authentication from your account settings at any time.",
                title: "TOTP Removed"
            });
            emit("totp-removed");
        } else {
            const response = await completeMFAchallenge(code.value, "totp");
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to complete TOTP challenge.");
            }
            emit("success");
        }
    } catch (error) {
        console.log("TOTP Challenge Error:", error);
        errorMessage.value = error.message || "An unknown error occurred.";
    } finally {
        code.value = "";
        loading.value = false;
    }
}; 
</script>
