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
import { mdiAlert, mdiCheckCircle, mdiGithub } from "@mdi/js";
import { createAuthClient } from "better-auth/vue";
import { shallowRef } from "vue";
import { useRouter } from "vue-router";
import { VAlert, VBtn, VDivider, VForm, VTextField } from "vuetify/components";
import { authClient, init as initAuth, logOut } from "@/stores/auth";

// import { createTOTPChallengeDialog } from "@/stores/mfa";

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
    const email = formData.get("email");
    const password = formData.get("password");
    loading.value = true;

    const { data, error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: props.redirect,
    });

    loading.value = false;
    console.log({ data, error });
    // await finaliseLogin();

    if (error) {
        errorAlert.value = {
            type: "error",
            icon: mdiAlert,
            title: "Login Failed",
            text: error.message || "Login failed.",
        };
    }
    // console.error("Login error:", err);
    // if (err.type === "user_more_factors_required") {
    //     const totpChallengeResp = await createTOTPChallengeDialog();
    //     if (
    //         totpChallengeResp.action === "success" ||
    //         totpChallengeResp.action === "totp-removed"
    //     ) {
    //         await finaliseLogin();
    //     } else {
    //         error.value = {
    //             type: "error",
    //             icon: mdiAlert,
    //             title: "Login Failed",
    //             text: "TOTP verification failed.",
    //         };
    //     }
    // } else {
    //     error.value = {
    //         type: "error",
    //         icon: mdiAlert,
    //         title: "Login Failed",
    //         text:
    //             err.message || "An unexpected error occurred during login.",
    //     };
    // }
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
