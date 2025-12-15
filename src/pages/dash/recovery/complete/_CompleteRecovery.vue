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
                <v-btn
                    type="submit"
                    color="primary"
                    :loading="loadingRecovery"
                >
                    Recover Account
                </v-btn>
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
import { account } from "@/appwrite";

export default {
    data() {
        return {
            alert: false,
            loadingRecovery: false,
            mdiAlert,
            recoveryDetails: {
                password: "",
                passwordConfirmation: "",
                secret: "",
                userId: ""
            }
        };
    },
    props: {
        secret: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            required: true
        }
    },
    methods: {
        async completeRecovery() {
            this.alert = false;
            if (!this.recoveryDetails.password) {
                this.alert = {
                    text: "Please enter a password.",
                    title: "Error"
                };
                return;
            }

            if (
                this.recoveryDetails.password !== this.recoveryDetails.passwordConfirmation
            ) {
                this.alert = {
                    text: "Passwords do not match.",
                    title: "Error"
                };
                return;
            }

            this.loadingRecovery = true;
            try {
                await account.updateRecovery(
                    this.recoveryDetails.userId,
                    this.recoveryDetails.secret,                    
                    this.recoveryDetails.password.trim(),
                    this.recoveryDetails.passwordConfirmation.trim()
                );

                this.alert = {
                    icon: mdiInformation,
                    text: "Account recovered successfully, redirecting you to the login page.",
                    title: "Success",
                    type: "success"
                };

                this.loadingRecovery = false;

                setTimeout(() => {
                    window.location.href = "/dash/login";
                }, 2000);
            } catch (error) {
                this.alert = {
                    text: error.message,
                    title: "Error"
                };

                this.loadingRecovery = false;
                return;
            }
        }
    },
    mounted() {
        this.recoveryDetails.userId = this.userId;
        this.recoveryDetails.secret = this.secret;
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
