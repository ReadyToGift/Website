<template>
    <v-card
        variant="flat"
    >
        <v-card-subtitle>
            Here you can manage your subscription and billing information.
        </v-card-subtitle>
    </v-card>

    <v-card
        class="mt-4"
        variant="tonal"
    >
        <v-card-title>
            Billing Information
        </v-card-title>

        <v-list
            class="mt-0"
        >
            <table>
                <thead>
                    <th>

                    </th>
                    <th>
                        Free
                    </th>
                    <th>
                        Pro
                    </th>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            Price
                        </td>
                        <td>
                            Free
                        </td>
                        <td>
                            {{ proPrice }}
                            $14.99 / year
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Public Lists
                        </td>
                        <td>
                            2
                        </td>
                        <td>
                            <v-icon
                                size="16"
                                :icon="mdiInfinity"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Private Lists
                        </td>
                        <td>
                            <v-icon
                                size="16"
                                :icon="mdiInfinity"
                            />
                        </td>
                        <td>
                            <v-icon
                                size="16"
                                :icon="mdiInfinity"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Autofill
                        </td>
                        <td>
                            ❌
                        </td>
                        <td>
                            ✅
                        </td>
                    </tr>
                </tbody>
            </table>
        </v-list>
    </v-card>
</template>

<script setup>
import { onMounted, reactive, shallowRef, watch } from "vue";

import { mdiAccount, mdiEmail, mdiFormTextboxPassword, mdiInfinity } from "@mdi/js";
import { AppwriteException } from "appwrite";
import { useStore } from "@nanostores/vue";
import { setUser, user as userStore } from "@/stores/auth";
import { getProPricing, polar as polarStore } from "@/stores/polar";
import { create as createDialog } from "@/stores/dialogs";

import { account } from "@/appwrite";

import MFA from "@/components/account/mfa/MFA.vue";
import UpdateAccountField from "@/components/account/UpdateAccountField.vue";

const polar = useStore(polarStore);
const user = useStore(userStore);

const proPrice = shallowRef({});

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

watch(
    () => user.value,
    (newUser) => {
        if (newUser) {
            personalInfo.email.value = newUser.email || "";
            personalInfo.fullName.value = newUser.name || "";
        }
    },
    { immediate: true }
);

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

const saveEmail = async () => {
    try {
        const result = await account.updateEmail(personalInfo.email.value, personalInfo.email.passwordConfirmation);

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
        personalInfo.email.passwordConfirmation = "";
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
                title: "Error Updating Email",
                type: "error"
            });
            return;
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

const savePassword = async () => {
    try {
        await account.updatePassword({
            oldPassword: personalInfo.password.passwordConfirmation,
            password: personalInfo.password.value
        });
        personalInfo.password.value = "";
        personalInfo.password.passwordConfirmation = "";
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

const loadProPrice = async () => {
    try {
        const price = await getProPricing();
        proPrice.value = price;
    } catch (error) {
        console.error("Failed to load Pro pricing:", error);
    }
};

onMounted(() => {
    loadProPrice();
});
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