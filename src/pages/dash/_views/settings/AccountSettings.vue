<template>
    <v-card variant="tonal">
        <v-card-title> Personal Information </v-card-title>

        <v-list class="mt-0">
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
                :requires-password="false"
                :update-on-save="false"
            />
        </v-list>
    </v-card>
    <v-card class="mt-4" variant="tonal">
        <v-card-title> Security Settings </v-card-title>
        <v-card-text>
            <p>
                Manage your security settings here, including changing your
                password.
            </p>
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
import { mdiAccount, mdiEmail, mdiFormTextboxPassword } from "@mdi/js";
import { useStore } from "@nanostores/vue";
import { reactive } from "vue";
import MFA from "@/components/account/mfa/MFA.vue";
import UpdateAccountField from "@/components/account/UpdateAccountField.vue";
import { authClient, setUser, user as userStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";

const user = useStore(userStore);

const personalInfo = reactive({
    email: {
        passwordConfirmation: "",
        value: user.value?.email || "",
    },
    fullName: {
        value: user.value?.name || "",
    },
    password: {
        passwordConfirmation: "",
        value: "",
    },
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
    const { data, error } = await authClient.updateUser({
        name: personalInfo.fullName.value,
    });
    if (!error) {
        setUser({ user: data?.user || data });
        personalInfo.fullName.passwordConfirmation = "";
        return true;
    }
    createDialog({
        text: `There was an error updating your name: ${error.message}`,
        title: "Error Updating Name",
        type: "error",
    });
    return false;
};

const saveEmail = async (newValue) => {
    try {
        const { error } = await authClient.changeEmail({
            newEmail: newValue.value,
            callbackURL: "/dash/lists",
        });
        if (!error) {
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK",
                    },
                ],
                text: "A verification email has been sent to your new email address.",
                title: "Verification Email Sent",
                type: "info",
            });
            return true;
        }
        throw new Error(error.message);
    } catch (error) {
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: error.message,
            title: "Error Updating Email",
            type: "error",
        });
        return false;
    }
};

const savePassword = async (newValue) => {
    try {
        const { error } = await authClient.changePassword({
            currentPassword: newValue.passwordConfirmation,
            newPassword: newValue.value,
            revokeOtherSessions: false,
        });
        if (error) throw new Error(error.message);
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: "Your password has been successfully updated.",
            title: "Password Updated",
            type: "success",
        });
        return true;
    } catch (error) {
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: error.message,
            title: "Error Updating Password",
            type: "error",
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
