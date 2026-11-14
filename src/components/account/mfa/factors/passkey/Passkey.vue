<template>
    <v-list-item
        title="Passkeys"
        subtitle="Use a device or security key to sign in without a password."
        :prepend-icon="mdiKey"
        class="passkey-heading"
    >
        <template #append>
            <v-btn
                color="primary"
                variant="tonal"
                :loading="adding"
                @click="addPasskey"
            >
                Add passkey
            </v-btn>
        </template>
    </v-list-item>
    <v-list-item
        v-for="passkey in passkeys"
        :key="passkey.id"
        :title="getPasskeyName(passkey)"
        :subtitle="
            passkey.createdAt
                ? `Added ${formatDate(passkey.createdAt)}`
                : undefined
        "
        class="passkey-entry"
    >
        <template #append>
            <v-btn
                :icon="mdiDelete"
                variant="text"
                color="error"
                :loading="deleting === passkey.id"
                aria-label="Delete passkey"
                @click="deletePasskey(passkey)"
            />
        </template>
    </v-list-item>
</template>

<script setup>
import { getAuthenticatorName } from "@better-auth/passkey";
import { mdiDelete, mdiKey } from "@mdi/js";
import { onMounted, ref } from "vue";
import { authClient } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";

const passkeys = ref([]);
const adding = ref(false);
const deleting = ref(null);

const showError = (title, error) => {
    createDialog({
        text: error?.message || "Please try again.",
        title,
        type: "error",
    });
};

const getPasskeyName = (passkey) =>
    getAuthenticatorName(passkey.aaguid) || passkey.name || "Passkey";

const loadPasskeys = async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
        showError("Unable to load passkeys", error);
        return;
    }
    passkeys.value = data || [];
};

const addPasskey = async () => {
    adding.value = true;
    try {
        const { data, error } = await authClient.passkey.addPasskey();
        if (error) {
            showError("Unable to add passkey", error);
            return;
        }
        if (data) passkeys.value = [data, ...passkeys.value];
        createDialog({
            actions: [{ action: "close", color: "primary", text: "OK" }],
            text: "You can now use this passkey to sign in.",
            title: "Passkey added",
            type: "success",
        });
    } finally {
        adding.value = false;
    }
};

const deletePasskey = async (passkey) => {
    const confirmation = await createDialog({
        actions: [
            { action: "close", text: "Cancel" },
            { action: "close", color: "error", text: "Delete" },
        ],
        text: `Delete ${passkey.name || "this passkey"}? You will no longer be able to use it to sign in.`,
        title: "Delete passkey?",
        type: "warning",
    });
    if (confirmation.action !== "Delete") return;

    deleting.value = passkey.id;
    try {
        const { error } = await authClient.passkey.deletePasskey({
            id: passkey.id,
        });
        if (error) {
            showError("Unable to delete passkey", error);
            return;
        }
        passkeys.value = passkeys.value.filter(
            (item) => item.id !== passkey.id,
        );
    } finally {
        deleting.value = null;
    }
};

const formatDate = (value) =>
    new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

onMounted(loadPasskeys);
</script>

<style lang="scss" scoped>
.passkey-heading {
    align-items: flex-start;
}

.passkey-entry {
    padding-left: 4.5rem;
}
</style>
