<template>
    <div class="page-content">
        <h1>Log In</h1>
        <div v-if="!emailStep" class="email-login">
            <v-form @submit.prevent="continueWithEmail">
                <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    name="email"
                    autocomplete="username webauthn"
                    autofocus
                    required
                />
                <v-btn type="submit" color="primary" :loading="loading">
                    Continue
                </v-btn>
            </v-form>
            <v-divider class="my-2">or</v-divider>
            <v-btn
                class="passkey-button"
                :prepend-icon="mdiKey"
                color="primary"
                :loading="passkeyLoading"
                @click="passkeyLogin"
            >
                Sign in with a passkey
            </v-btn>
        </div>
        <div v-else class="password-login">
            <v-text-field
                :model-value="email"
                label="Email"
                type="email"
                autocomplete="username webauthn"
                readonly
                @click="resetEmailStep"
            />
            <v-form @submit.prevent="passwordLogin">
                <v-text-field
                    v-model="password"
                    label="Password"
                    type="password"
                    name="password"
                    autocomplete="current-password webauthn"
                    autofocus
                />
                <v-btn type="submit" color="primary" :loading="loading">
                    Login
                </v-btn>
            </v-form>
        </div>
        <div v-if="emailStep" class="magic-link-login">
            <v-divider class="my-2">or</v-divider>
            <v-btn
                color="secondary"
                variant="outlined"
                :loading="magicLinkLoading"
                @click="magicLinkLogin"
            >
                Email me a sign-in link
            </v-btn>
            <v-btn variant="text" @click="resetEmailStep"
                >Use a different email</v-btn
            >
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
import { mdiAlert, mdiKey } from "@mdi/js";
import { onMounted, ref, shallowRef } from "vue";
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
const email = ref("");
const password = ref("");
const emailStep = ref(false);
const magicLinkLoading = ref(false);
const passkeyLoading = ref(false);

const preloadPasskey = async () => {
    if (
        !window.PublicKeyCredential?.isConditionalMediationAvailable ||
        !(await window.PublicKeyCredential.isConditionalMediationAvailable())
    ) {
        return;
    }

    try {
        const { error } = await authClient.signIn.passkey({ autoFill: true });
        if (!error) {
            await refreshSession();
            await router.push(props.redirect);
        }
    } catch (error) {
        // Conditional UI is optional; browsers can reject the request when
        // no passkey is available or the user dismisses the prompt.
        console.debug("Passkey autofill unavailable", error);
    }
};

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

const continueWithEmail = () => {
    errorAlert.value = null;
    email.value = email.value.trim();
    if (email.value) emailStep.value = true;
};

const resetEmailStep = () => {
    emailStep.value = false;
    password.value = "";
    errorAlert.value = null;
};

const passkeyLogin = async () => {
    errorAlert.value = null;
    passkeyLoading.value = true;

    const { error } = await authClient.signIn.passkey({
        autoFill: false,
    });

    passkeyLoading.value = false;

    if (error) {
        errorAlert.value = {
            type: "error",
            icon: mdiAlert,
            title: "Passkey sign-in failed",
            text: error.message || "Please try another sign-in method.",
        };
        return;
    }

    await refreshSession();
    await router.push(props.redirect);
};

const passwordLogin = async () => {
    loading.value = true;

    const { data, error } = await authClient.signIn.email({
        email: email.value,
        password: password.value.trim(),
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
        window.location.assign(props.redirect);
        return;
    }

    await refreshSession();
    await router.push(props.redirect);
};

const magicLinkLogin = async () => {
    errorAlert.value = null;
    magicLinkLoading.value = true;

    const { error } = await authClient.signIn.magicLink({
        email: email.value,
        callbackURL: props.redirect,
    });

    magicLinkLoading.value = false;

    if (error) {
        errorAlert.value = {
            type: "error",
            icon: mdiAlert,
            title: "Unable to send sign-in link",
            text: error.message || "Please try again.",
        };
        return;
    }

    errorAlert.value = {
        type: "success",
        title: "Check your email",
        text: "We sent you a sign-in link. It will expire in 5 minutes.",
    };
};

onMounted(preloadPasskey);
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
    .email-login {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        form {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            button {
                width: 100%;
            }
        }
        .v-divider {
            margin: 0.25rem 0 !important;
        }
    }
    .magic-link-login {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        button {
            width: 100%;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            button {
                width: 100%;
            }
        }
    }
    .passkey-button {
        width: 100%;
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
