<template>
    <div class="page-content">
        <h1>Register</h1>
        <div class="password-register">
            <v-form @submit.prevent="register">
                <v-text-field
                    v-model.trim="registrationDetails.name"
                    label="Name"
                    type="text"
                    autofocus
                />
                <v-text-field
                    v-model.trim="registrationDetails.email"
                    label="Email"
                    type="email"
                />
                <v-text-field
                    v-model.trim="registrationDetails.password"
                    label="Password"
                    type="password"
                />
                <v-text-field
                    v-model.trim="registrationDetails.passwordConfirmation"
                    label="Password Confirmation"
                    type="password"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    :loading="loadingRegistration"
                    >Register</v-btn
                >
            </v-form>
            <v-alert
                :type="alert.type || 'error'"
                border="start"
                elevation="2"
                v-if="alert"
                :icon="alert.icon || mdiAlert"
                :title="alert.title"
                :text="alert.text"
                class="mt-4"
            />
        </div>
        <p>
            Already have an account?
            <router-link :to="{ path: '/dash/login', query: { redirect } }"
                >Login here</router-link
            >
        </p>
    </div>
</template>

<script setup>
import { mdiAlert, mdiInformation } from "@mdi/js";
import { reactive, shallowRef } from "vue";
import { authClient } from "@/stores/auth";

const props = defineProps({
    redirect: {
        type: String,
        default: "/dash/lists",
    },
});

const alert = shallowRef(null);
const loadingRegistration = shallowRef(false);
const registrationDetails = reactive({
    email: "",
    name: "",
    password: "",
    passwordConfirmation: "",
});

const register = async () => {
    alert.value = null;
    const details = registrationDetails;

    if (!details.name) {
        alert.value = { text: "Please enter a name.", title: "Error" };
        return;
    }
    if (!details.email) {
        alert.value = {
            text: "Please enter an email address.",
            title: "Error",
        };
        return;
    }
    if (!details.password) {
        alert.value = { text: "Please enter a password.", title: "Error" };
        return;
    }
    if (details.password !== details.passwordConfirmation) {
        alert.value = { text: "Passwords do not match.", title: "Error" };
        return;
    }

    loadingRegistration.value = true;
    const { error } = await authClient.signUp.email({
        callbackURL: props.redirect,
        email: details.email.trim(),
        name: details.name.trim(),
        password: details.password.trim(),
    });
    loadingRegistration.value = false;

    if (error) {
        alert.value = {
            text: error.message || "Unable to create your account.",
            title: "Error",
        };
        return;
    }

    alert.value = {
        icon: mdiInformation,
        text: "Account created. Check your email to verify your address. You’ll be signed in automatically when you follow the verification link.",
        title: "Success",
        type: "success",
    };
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
    .password-register {
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
