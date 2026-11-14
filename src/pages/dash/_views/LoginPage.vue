<template>
    <div class="page-content">
        <h1>Log In</h1>
        <div class="password-login">
            <v-form @submit.prevent="passwordLogin">
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
                <v-btn type="submit" color="primary" :loading="loading">
                    Login
                </v-btn>
            </v-form>
        </div>
        <div class="alert">
            <v-alert
                :type="errorAlert.type || 'error'"
                border="start"
                elevation="2"
                v-if="errorAlert"
                :icon="errorAlert.icon || mdiAlert"
                :title="errorAlert.title"
                :text="errorAlert.text"
                class="mt-4"
            />
        </div>
        <p>
            Don't have an account?
            <router-link :to="{ path: '/dash/register', query: { redirect } }"
                >Register here</router-link
            >
        </p>
        <p>
            <router-link
                :to="{ path: '/dash/recovery/start', query: { redirect } }"
                >Forgot your password?</router-link
            >
        </p>
    </div>
</template>

<script setup>
import { mdiAlert } from "@mdi/js";
import { shallowRef } from "vue";
import { useRouter } from "vue-router";
import { authClient, refreshSession } from "@/stores/auth";
import { createTOTPChallengeDialog } from "@/stores/mfa";

const props = defineProps({
    redirect: {
        default: "/dash/lists",
        type: String,
    },
});

const router = useRouter();

const errorAlert = shallowRef(null);
const loading = shallowRef(false);

// const finaliseLogin = async () => {
//     const accountSession = await authClient.getCurrentUser();
//     console.log("Login successful:", accountSession);

//     await initAuth({ router, currentAccount: accountSession });

//     console.log("Redirecting to:", props.redirect);

//     error.value = {
//         type: "success",
//         icon: mdiCheckCircle,
//         title: "Login Successful",
//         text: "You have been logged in successfully.",
//     };

//     await router.push({ path: props.redirect });
// };

const passwordLogin = async (event) => {
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get("email")?.trim();
    const password = formData.get("password")?.trim();
    loading.value = true;

    const { data, error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: props.redirect,
    });

    loading.value = false;

    if (error) {
        errorAlert.value = {
            type: "error",
            icon: mdiAlert,
            title: "Login Failed",
            text:
                error.status === 403
                    ? "Please verify your email address first. A new verification email has been sent."
                    : error.message || "Login failed.",
        };
        return;
    }

    if (data?.twoFactorRedirect) {
        const challengeResponse = await createTOTPChallengeDialog();
        if (challengeResponse.action !== "success") {
            errorAlert.value = {
                type: "error",
                icon: mdiAlert,
                title: "Login Failed",
                text: "Two-factor authentication was not completed.",
            };
            return;
        }
        await refreshSession();
    }

    await router.push(props.redirect);
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
