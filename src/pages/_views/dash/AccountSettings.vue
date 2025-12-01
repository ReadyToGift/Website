<template>
    <div class="page-content">
        <v-card
            variant="tonal"
            color="secondary"
        >
            <v-card-title>
                Account Settings
            </v-card-title>
            <v-card-text>
                <p>This is a placeholder for the Account Settings page.</p>
                <p>Here you will be able to manage your account details, change your password, and configure other
                    settings related to your profile.</p>
            </v-card-text>
        </v-card>

        <v-card
            class="mt-4"
            variant="tonal"
            color="secondary"
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
            color="secondary"
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
    </div>
</template>

<script setup>
import { reactive } from "vue";

import { mdiAccount, mdiEmail, mdiFormTextboxPassword } from "@mdi/js";
import { AppwriteException } from "appwrite";
import { useAuthStore } from "@/stores/auth";
import { useDialogs } from "@/stores/dialogs";

import { account } from "@/appwrite";

import MFA from "@/components/account/mfa/MFA.vue";
import UpdateAccountField from "@/components/account/UpdateAccountField.vue";

const auth = useAuthStore();
const dialogs = useDialogs();

const personalInfo = reactive({
    email: {
        passwordConfirmation: "",
        value: auth.user?.email || ""
    },
    fullName: {
        value: auth.user?.name || ""
    },
    password: {
        passwordConfirmation: "",
        value: ""
    }
});

auth.$subscribe((mutation) => {
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
        auth.setUser(result);
        personalInfo.fullName.passwordConfirmation = "";
        return true;
    } else {
        dialogs.create({
            text: `There was an error updating your name: ${result.message}`,
            title: "Error Updating Name",
            type: "error"
        });
        return false;
    }
};

const saveEmail = async () => {
    try {
        const result = await account.updateEmail(personalInfo.email.value, personalInfo.email.passwordConfirmation);

        auth.setUser(result);
        await account.createEmailVerification({ url: "https://readyto.gift/dash/verify" });
        dialogs.create({
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
        personalInfo.email.passwordConfirmation = "";
        return true;
    } catch (error) {
        if (error instanceof AppwriteException) {
            dialogs.create({
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
            return;
        }
        dialogs.create({
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

const savePassword = async () => {
    try {
        await account.updatePassword({
            oldPassword: personalInfo.password.passwordConfirmation,
            password: personalInfo.password.value
        });
        personalInfo.password.value = "";
        personalInfo.password.passwordConfirmation = "";
        dialogs.create({
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
            dialogs.create({
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
        dialogs.create({
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

    .v-list {
        max-width: 100%;
        width: max-content;
    }

    @media screen and (max-width: 768px) {
        .v-list {
            width: 100%;
        }
    }
}
</style>