<template>
    <v-card variant="tonal">
        <v-card-title> Profile Picture </v-card-title>
        <v-card-text class="profile-picture-settings">
            <v-avatar size="96">
                <v-img :src="profilePicture" alt="Profile picture" />
            </v-avatar>
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                hidden
                @change="selectProfilePicture"
            >
            <v-btn color="primary" variant="tonal" @click="openFilePicker">
                Upload picture
            </v-btn>
            <v-btn
                v-if="user?.image"
                variant="text"
                @click="resetProfilePicture"
            >
                Remove picture
            </v-btn>
        </v-card-text>
    </v-card>
    <v-card class="mt-4" variant="tonal">
        <v-card-title> Personal Information </v-card-title>

        <v-list class="mt-0">
            <UpdateAccountField
                name="Full Name"
                :icon="mdiAccount"
                v-model="personalInfo.fullName"
                :save="saveName"
                autocomplete="name"
                :requires-password="false"
            />
            <UpdateAccountField
                name="Email"
                :icon="mdiEmail"
                v-model="personalInfo.email"
                :save="saveEmail"
                autocomplete="email"
                :requires-password="false"
                :update-on-save="false"
            />
        </v-list>
    </v-card>
    <v-card class="mt-4" variant="tonal">
        <v-card-title> Security Settings </v-card-title>
        <v-card-text>
            <p>
                Manage your security settings here, including changing your
                password.
            </p>
        </v-card-text>
        <v-list>
            <UpdateAccountField
                name="Password"
                :icon="mdiFormTextboxPassword"
                v-model="personalInfo.password"
                :save="savePassword"
                autocomplete="new-password"
            />
            <MFA />
        </v-list>
    </v-card>
    <v-dialog v-model="cropDialog" max-width="600">
        <v-card>
            <v-card-title> Crop Profile Picture </v-card-title>
            <v-card-text>
                <Cropper
                    ref="cropper"
                    class="profile-picture-cropper"
                    :src="profilePictureSource"
                    :stencil-props="{ aspectRatio: 1 }"
                />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="cancelCrop">Cancel</v-btn>
                <v-btn
                    color="primary"
                    :loading="savingProfilePicture"
                    @click="saveProfilePicture"
                >
                    Save picture
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { mdiAccount, mdiEmail, mdiFormTextboxPassword } from "@mdi/js";
import { useStore } from "@nanostores/vue";
import { computed, onMounted, reactive, ref } from "vue";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import MFA from "@/components/account/mfa/MFA.vue";
import UpdateAccountField from "@/components/account/UpdateAccountField.vue";
import { authClient, refreshSession, user as userStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";

const user = useStore(userStore);
const fileInput = ref(null);
const cropper = ref(null);
const cropDialog = ref(false);
const profilePictureSource = ref("");
const savingProfilePicture = ref(false);

const profilePicture = computed(() => {
    if (!user.value) return "";
    return `/api/avatar/${user.value.id}?v=${encodeURIComponent(user.value.updatedAt || "")}`;
});

const openFilePicker = () => fileInput.value?.click();

const closeCrop = () => {
    if (profilePictureSource.value.startsWith("blob:")) {
        URL.revokeObjectURL(profilePictureSource.value);
    }
    profilePictureSource.value = "";
    cropDialog.value = false;
};

const cancelCrop = () => closeCrop();

const selectProfilePicture = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file?.type.startsWith("image/")) return;

    closeCrop();
    profilePictureSource.value = URL.createObjectURL(file);
    cropDialog.value = true;
};

const saveProfilePicture = async () => {
    const canvas = cropper.value?.getResult()?.canvas;
    if (!canvas) return;

    savingProfilePicture.value = true;
    try {
        const maxSize = 256;
        const scale = Math.min(
            1,
            maxSize / Math.max(canvas.width, canvas.height),
        );
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = Math.max(1, Math.round(canvas.width * scale));
        outputCanvas.height = Math.max(1, Math.round(canvas.height * scale));

        const context = outputCanvas.getContext("2d");
        if (!context) throw new Error("Unable to process profile picture.");

        context.drawImage(
            canvas,
            0,
            0,
            outputCanvas.width,
            outputCanvas.height,
        );

        const image = outputCanvas.toDataURL("image/jpeg", 0.85);
        const { error } = await authClient.updateUser({ image });
        if (error) throw new Error(error.message);

        await refreshSession();
        closeCrop();
    } catch (error) {
        createDialog({
            text: error.message || "Unable to save your profile picture.",
            title: "Error Updating Profile Picture",
            type: "error",
        });
    } finally {
        savingProfilePicture.value = false;
    }
};

const resetProfilePicture = async () => {
    savingProfilePicture.value = true;
    try {
        const { error } = await authClient.updateUser({ image: null });
        if (error) throw new Error(error.message);
        await refreshSession();
    } catch (error) {
        createDialog({
            text: error.message || "Unable to reset your profile picture.",
            title: "Error Resetting Profile Picture",
            type: "error",
        });
    } finally {
        savingProfilePicture.value = false;
    }
};

const personalInfo = reactive({
    email: {
        passwordConfirmation: "",
        value: user.value?.email || "",
    },
    fullName: {
        value: user.value?.name || "",
    },
    password: {
        passwordConfirmation: "",
        value: "",
    },
});

userStore.subscribe((mutation) => {
    if (!mutation?.events) return;
    if (mutation.events.key !== "user") return;
    const newUser = mutation.events.newValue;
    if (newUser) {
        personalInfo.email.value = newUser.email || "";
        personalInfo.fullName.value = newUser.name || "";
    }
});

const saveName = async (newValue) => {
    const { error } = await authClient.updateUser({
        name: newValue.value,
    });
    if (!error) {
        await refreshSession();
        personalInfo.fullName.passwordConfirmation = "";
        return true;
    }
    createDialog({
        text: `There was an error updating your name: ${error.message}`,
        title: "Error Updating Name",
        type: "error",
    });
    return false;
};

const saveEmail = async (newValue) => {
    try {
        const { error } = await authClient.changeEmail({
            newEmail: newValue.value,
            callbackURL: `/dash/settings/account?emailChange=pending&email=${encodeURIComponent(newValue.value)}`,
        });
        if (!error) {
            createDialog({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK",
                    },
                ],
                text: "A verification email has been sent to your new email address.",
                title: "Verification Email Sent",
                type: "info",
            });
            return true;
        }
        throw new Error(error.message);
    } catch (error) {
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: error.message,
            title: "Error Updating Email",
            type: "error",
        });
        return false;
    }
};

onMounted(() => {
    const handleEmailChangeStatus = async () => {
        const url = new URL(window.location.href);
        if (url.searchParams.get("emailChange") !== "pending") return;

        await refreshSession();
        const requestedEmail = url.searchParams.get("email");
        const isConfirmed =
            requestedEmail?.toLowerCase() === user.value?.email?.toLowerCase();

        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: isConfirmed
                ? "Your new email address has been confirmed."
                : "The request was approved. Check your new email inbox for the verification link.",
            title: isConfirmed
                ? "Email Address Updated"
                : "Email Change Approved",
            type: "info",
        });

        url.searchParams.delete("emailChange");
        url.searchParams.delete("email");
        window.history.replaceState({}, "", url);
    };

    handleEmailChangeStatus();
});

const savePassword = async (newValue) => {
    try {
        const { error } = await authClient.changePassword({
            currentPassword: newValue.passwordConfirmation,
            newPassword: newValue.value,
            revokeOtherSessions: false,
        });
        if (error) throw new Error(error.message);
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: "Your password has been successfully updated.",
            title: "Password Updated",
            type: "success",
        });
        return true;
    } catch (error) {
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK",
                },
            ],
            text: error.message,
            title: "Error Updating Password",
            type: "error",
        });
        return false;
    }
};
</script>

<style lang="scss" scoped>
.profile-picture-settings {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.profile-picture-cropper {
    height: min(70vw, 480px);
    max-height: 480px;
    background: #222;
}

main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
    }
}
</style>
