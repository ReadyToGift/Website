<template>
    <div class="page-content">
        <h1>Verify</h1>
        <div class="verify">
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
import { VAlert } from "vuetify/components";
import { mdiAlert, mdiInformation } from "@mdi/js";
import { account } from "@/appwrite";
import { user as userStore } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

export default {
    components: {
        VAlert
    },
    data() {
        return {
            alert: false,
            user: useStore(userStore),
            loadingVerification: false,
            mdiAlert
        };
    },
    props: {
        userId: {
            type: String,
            required: true
        },
        secret: {
            type: String,
            required: true
        }
    },
    methods: {
        async verify() {
            this.loadingVerification = true;
            this.alert = false;

            if (!this.userId || !this.secret) {
                this.alert = {
                    text: "Invalid verification link.",
                    title: "Error"
                };
                this.loadingVerification = false;
                return;
            }

            try {
                await account.updateVerification(this.userId, this.secret);

                this.alert = {
                    icon: mdiInformation,
                    text: "Account successfully verified, redirecting you to the main page.",
                    title: "Success",
                    type: "success"
                };

                await this.auth.init();
                this.$router.push("/dash/lists");
            } catch (error) {
                this.alert = {
                    text: error.message,
                    title: "Error"
                };
            }

            this.loadingVerification = false;
        }
    },
    mounted() {
        this.verify();
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
    .verify {
        width: 100%;
    }
    hr {
        width: 100%;
    }
}
</style>
