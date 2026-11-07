<template>
    <div class="page-content">
        <h1>Complete Recovery</h1>
        <div class="complete-recovery">
            <v-form @submit.prevent="completeRecovery">
                <v-text-field
                    v-model="recoveryDetails.password"
                    label="Password"
                    type="password"
                />
                <v-text-field
                    v-model="recoveryDetails.passwordConfirmation"
                    label="Password Confirmation"
                    type="password"
                />
                <v-btn type="submit" color="primary" :loading="loadingRecovery">
                    Recover Account
                </v-btn>
                {{ { recoveryDetails } }}
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
    </div>
</template>

<script>
import { mdiAlert, mdiInformation } from "@mdi/js";
import { useRouter } from "vue-router";
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
            recoveryDetails: {
                password: "",
                passwordConfirmation: "",
                token: "",
            },
        };
    },
    methods: {
        async completeRecovery() {
            this.alert = false;
            if (!this.recoveryDetails.password) {
                this.alert = {
                    text: "Please enter a password.",
                    title: "Error",
                };
                return;
            }

            if (
                this.recoveryDetails.password !==
                this.recoveryDetails.passwordConfirmation
            ) {
                this.alert = {
                    text: "Passwords do not match.",
                    title: "Error",
                };
                return;
            }

            this.loadingRecovery = true;
            const { error } = await authClient.resetPassword({
                newPassword: this.recoveryDetails.password.trim(),
                token: this.recoveryDetails.token,
            });

            this.loadingRecovery = false;

            if (error) {
                this.alert = {
                    text: error.message,
                    title: "Error",
                    type: "error",
                };
            } else {
                this.alert = {
                    icon: mdiInformation,
                    text: "Account recovered successfully, redirecting you to the login page.",
                    title: "Success",
                    type: "success",
                };

                setTimeout(() => {
                    this.$router.push("/dash/login");
                }, 2000);
            }
        },
    },
    mounted() {
        const router = useRouter();
        this.recoveryDetails.token = router.currentRoute.value.query.token;
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
    .complete-recovery {
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
