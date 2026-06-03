<template>
    <v-card
        variant="tonal"
    >
        <v-card-title>
            Personal Information
        </v-card-title>

        <v-list
            class="mt-0"
        >
            <UpdateAccountField
                name="Full Name"
                :icon="mdiAccount"
                v-model="personalInfo.fullName"
                :save="saveName"
                autocomplete="name"
                :requires-password="false"
            />
            <UpdateAccountField
                name="Email"
                :icon="mdiEmail"
                v-model="personalInfo.email"
                :save="saveEmail"
                autocomplete="email"
            />
        </v-list>
    </v-card>
    <v-card
        class="mt-4"
        variant="tonal"
    >
        <v-card-title>
            Security Settings
        </v-card-title>
        <v-card-text>
            <p>Manage your security settings here, including changing your password.</p>
        </v-card-text>
        <v-list>
            <UpdateAccountField
                name="Password"
                :icon="mdiFormTextboxPassword"
                v-model="personalInfo.password"
                :save="savePassword"
                autocomplete="new-password"
            />
            <MFA />
        </v-list>
    </v-card>
</template>

<script setup>
import { VCard, VCardText, VCardTitle, VList } from "vuetify/components";
import { reactive } from "vue";

import { mdiAccount, mdiEmail, mdiFormTextboxPassword } from "@mdi/js";
import { AppwriteException } from "appwrite";

import { setUser, user as userStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";
import { useStore } from "@nanostores/vue";

import { account } from "@/appwrite";

import MFA from "@/components/vuetify/account/mfa/MFA.vue";
import UpdateAccountField from "@/components/vuetify/account/UpdateAccountField.vue";

const user = useStore(userStore);

const personalInfo = reactive({
    email: {
        passwordConfirmation: "",
        value: user.value?.email || ""
    },
    fullName: {
        value: user.value?.name || ""
    },
    password: {
        passwordConfirmation: "",
        value: ""
    }
});

userStore.subscribe((mutation) => {
    if (!mutation?.events) return;
    if (mutation.events.key !== "user") return;
    const newUser = mutation.events.newValue;
    if (newUser) {
        personalInfo.email.value = newUser.email || "";
        personalInfo.fullName.value = newUser.name || "";
    }
});

const saveName = async () => {
    const result = await account.updateName(personalInfo.fullName.value);
    if (result.$id) {
        setUser({ user: result });
        personalInfo.fullName.passwordConfirmation = "";
        return true;
    } else {
        createDialog({
            text: `There was an error updating your name: ${result.message}`,
            title: "Error Updating Name",
            type: "error"
        });
        return false;
    }
};

const saveEmail = async (newValue) => {
    try {
        const result = await account.updateEmail(newValue.value, newValue.passwordConfirmation);
        console.log({ result });
        if (result.$id) {
            setUser({ user: result });
            await account.createEmailVerification({ url: "https://readyto.gift/dash/verify" });
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text: "A verification email has been sent to your new email address.",
                title: "Verification Email Sent",
                type: "info"
            });
            return true;
        } else {
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text: `There was an error updating your email: ${result.message}`,
                title: "Error Updating Email",
                type: "error"
            });
            return false;
        }

    } catch (error) {
        if (error instanceof AppwriteException) {
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text: error.message,
                title: "Error Updating Email",
                type: "error"
            });
            return false;
        }
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            text: error.message,
            title: "Error Updating Email",
            type: "error"
        });
        return false;
    }
};

const savePassword = async (newValue) => {
    try {
        await account.updatePassword({
            oldPassword: newValue.passwordConfirmation,
            password: newValue.value
        });
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            text: "Your password has been successfully updated.",
            title: "Password Updated",
            type: "success"
        });
        return true;
    } catch (error) {
        if (error instanceof AppwriteException) {
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text: error.message,
                title: "Error Updating Password",
                type: "error"
            });
            return false;
        }
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ],
            text: error.message,
            title: "Error Updating Password",
            type: "error"
        });
        return false;
    }
};
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
    }
}
</style>