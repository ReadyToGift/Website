<template>
    <div class="page-content">
        <h1>Log In</h1>
        <div
            class="password-login"
            v-if="methods.includes('password')"
        >
            <v-form
                @submit.prevent="passwordLogin"
            >
                <v-text-field
                    label="Email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    autofocus
                />
                <v-text-field
                    label="Password"
                    type="password"
                    name="password"
                    autocomplete="current-password"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    :loading="loading"
                >
                    Login
                </v-btn>
            </v-form>
        </div>
        <v-divider
            v-if="methods.includes('password') && methods.length > 1"
            color="border"
            :thickness="3"
        />
        <div class="buttons">
            <v-btn
                variant="tonal"
                :prepend-icon="methodsData[method].icon"
                @click="methodsData[method].login()"
                v-for="method in methods.filter((method) => method !== 'password')"
                :key="method"
            >Login with {{ methodsData[method].name }}</v-btn>
            <v-alert
                v-if="methods.length === 0"
                type="error"
                :icon="mdiAlert"
                class="mt-4"
                text="No login methods are enabled. Please contact the site administrator."
            />
        </div>
        <div class="alert">
            <v-alert
                :type="error.type || 'error'"
                border="start"
                elevation="2"
                v-if="error"
                :icon="error.icon || mdiAlert"
                :title="error.title"
                :text="error.text"
                class="mt-4"
            />
        </div>
        <p>
            Don't have an account?
            <a :href="`/dash/register?redirect=${redirect}`">Register here</a>
        </p>
        <p v-if="methods.includes('password')">
            <a :href="`/dash/recovery/start?redirect=${redirect}`">Forgot your password?</a>
        </p>
    </div>
</template>

<script setup>
import { mdiAlert, mdiGithub } from "@mdi/js";
import { VAlert, VBtn, VDivider, VForm, VTextField } from "vuetify/components";
import { account, client } from "@/appwrite";
import { createTOTPChallengeDialog } from "@/stores/mfa";
import { APPWRITE_PROJECT, LOGIN_METHODS } from "astro:env/client";
import { shallowRef } from "vue";

const props = defineProps({
    redirect: {
        default: "/dash/lists",
        type: String
    }
});

const methods = LOGIN_METHODS.split(",").map((method) => method.trim());
const error = shallowRef(null);
const loading = shallowRef(false);

fetch("/api/auth", {
    method: "DELETE",
    credentials: "include"
});

const methodsData = {
    github: {
        icon: mdiGithub,
        login: () => {
            window.location.href = `/api/auth/oauth/github?redirect=${encodeURIComponent(props.redirect)}`;
        },
        name: "Github"
    }
};

const passwordLogin = async (event) => {
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get("email");
    const password = formData.get("password");
    loading.value = true;

    try {
        try {
            await account.deleteSession("current");
        } catch {} // eslint-disable-line no-empty

        const session = await account.createEmailPasswordSession(email, password);
        console.log({ session });

        window.location.href = props.redirect;
    } catch (err) {
        console.error("Login error:", err);

        if (err.type === "user_more_factors_required") {
            const totpChallengeResp = await createTOTPChallengeDialog();
            
            if (totpChallengeResp.action === "success" || totpChallengeResp.action === "totp-removed") {
                window.location.href = props.redirect;
            } else {
                error.value = {
                    type: "error",
                    icon: mdiAlert,
                    title: "Login Failed",
                    text: "TOTP verification failed."
                };
            }
        } else {
            error.value = {
                type: "error",
                icon: mdiAlert,
                title: "Login Failed",
                text: err.message || "An unexpected error occurred during login."
            };
        }
    } finally {
        loading.value = false;
    }
};
</script>

<style lang="scss" scoped>
.page-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    align-items: center;
    width: 400px;
    max-width: 90%;
    margin: auto;
    .password-login {
        width: 100%;
        form {
            button {
                width: 100%;
            }
        }
    }
    hr {
        width: 100%;
    }
    .buttons {
        width: 100%;
        button {
            width: 100%;
        }
    }
}
</style>
