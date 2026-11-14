<template>
    <div class="page-content">
        <h1>Start Recovery</h1>
        <div class="recovery">
            <v-form @submit.prevent="startRecovery">
                <v-text-field
                    v-model="recoveryDetails.email"
                    label="Email"
                    type="email"
                    autofocus
                />
                <v-btn type="submit" color="primary" :loading="loadingRecovery"
                    >Start</v-btn
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
                class="my-4"
            />
            <p>
                Remember your login?
                <router-link :to="{ path: '/dash/login', query: { redirect } }"
                    >Login here</router-link
                >
            </p>
        </div>
    </div>
</template>

<script>
import { mdiAlert, mdiGithub } from "@mdi/js";
import { VAlert, VBtn, VForm, VTextField } from "vuetify/components";
import { authClient } from "@/stores/auth";

export default {
    components: {
        VForm,
        VTextField,
        VBtn,
        VAlert,
    },
    data() {
        return {
            alert: false,
            loadingRecovery: false,
            mdiAlert,
            mdiGithub,
            recoveryDetails: {
                email: "",
            },
        };
    },
    mounted() {
        const email =
            new URLSearchParams(window.location.search).get("email") ||
            this.$route?.query?.email;
        if (typeof email === "string") {
            this.recoveryDetails.email = email.trim();
        }
    },
    props: {
        redirect: {
            type: String,
            default: "/dash/lists",
        },
    },
    methods: {
        async startRecovery() {
            this.alert = false;
            this.loadingRecovery = true;
            const { error } = await authClient.requestPasswordReset({
                email: this.recoveryDetails.email,
                redirectTo: `/dash/recovery/complete`,
            });

            this.loadingRecovery = false;

            if (error) {
                this.alert = {
                    title: "Login Failed",
                    text: error.message || "Login failed.",
                    type: "error",
                };
            } else {
                this.alert = {
                    text: "Recovery email sent",
                    title: "Success",
                    type: "success",
                };
            }
        },
    },
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
    .recovery {
        width: 100%;
        form {
            button {
                width: 100%;
            }
        }
        > p {
            text-align: center;
            margin-top: 1rem;
        }
    }
}
</style>
