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
            <v-text-field
                v-if="requiresPassword"
                v-model="password"
                class="mt-4"
                label="Current password"
                type="password"
                autocomplete="current-password"
            />
            <a
                class="text-blue font-weight-bold cursor-pointer"
                @click="usingRecoveryCode = true"
            >
                Lost your authenticator app?
            </a>
        </template>
        <template v-else>
            Please enter one of your recovery codes. If you don't have any
            recovery codes left, please contact support.
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
            <v-text-field
                v-if="requiresPassword"
                v-model="password"
                class="mt-4"
                label="Current password"
                type="password"
                autocomplete="current-password"
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
                This will disable your multi-factor authentication. You can
                re-enable it later from your account settings.
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
        <v-btn text @click="$emit('cancel')"> Cancel </v-btn>
        <v-spacer />
        <v-btn
            color="primary"
            :disabled="
                (usingRecoveryCode
                    ? recoveryCode.length !== 10
                    : code.length !== 6) ||
                (requiresPassword && !password)
            "
            @click="submit"
            :loading="loading"
        >
            Submit
        </v-btn>
    </v-card-actions>
</template>

<script setup>
import { shallowRef } from "vue";
import {
    VAlert,
    VBtn,
    VCardActions,
    VCardText,
    VOtpInput,
    VSpacer,
    VTextField,
} from "vuetify/components";
import { completeMFAchallenge } from "@/stores/mfa";

const emit = defineEmits(["cancel", "success", "totp-removed"]);
const { requiresPassword = false } = defineProps({
    requiresPassword: Boolean,
});

const code = shallowRef("");
const recoveryCode = shallowRef("");
const password = shallowRef("");
const errorMessage = shallowRef("");
const usingRecoveryCode = shallowRef(false);
const loading = shallowRef(false);

const submit = async () => {
    if (loading.value) return;
    loading.value = true;
    try {
        if (usingRecoveryCode.value) {
            await completeMFAchallenge(recoveryCode.value, "recoverycode");
            emit("success", { password: password.value });
        } else {
            await completeMFAchallenge(code.value, "totp");
            emit("success", { password: password.value });
        }
    } catch (error) {
        console.log("TOTP Challenge Error:", error);
        errorMessage.value = error.message || "An unknown error occurred.";
    } finally {
        code.value = "";
        password.value = "";
        loading.value = false;
    }
};
</script>
