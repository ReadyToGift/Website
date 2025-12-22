<template>
    <v-dialog
        :max-width="$vuetify.display.mobile ? '100%' : '500px'"
        v-model="dialogOpen"
    >
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                color="error"
                :icon="mdiDelete"
                :variant="variant"
            />
        </template>

        <template v-slot:default="{ isActive }">
            <v-card title="Delete Item">
                <v-card-text>
                    Are you sure you want to delete this item?
                    <v-alert
                        v-if="item.fulfillment"
                        :icon="mdiAlert"
                        text="Please unfulfill this item before deleting it."
                        title="Item is fulfilled"
                        class="mt-4"
                        color="primary"
                    />
                    <v-alert
                        v-if="alert"
                        type="error"
                        border="start"
                        elevation="2"
                        :icon="mdiAlert"
                        :title="alert.title"
                        :text="alert.text"
                        class="mt-4"
                    />
                </v-card-text>
                <v-card-actions>
                    <v-btn
                        text="Cancel"
                        @click="isActive.value = false"
                    />
                    <v-btn
                        color="error"
                        text="Delete"
                        @click="deleteItem"
                        variant="elevated"
                        :disabled="!!item.fulfillment"
                        :loading="loading"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_ITEM_COLLECTION } from "astro:env/client";
import { databases, storage } from "@/appwrite";
import { mdiAlert, mdiDelete } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog } from "vuetify/components";
import { AppwriteException } from "appwrite";
export default {
    title: "ListDialog",
    components: {
        VDialog,
        VBtn,
        VCard,
        VCardText,
        VCardActions,
        VAlert
    },
    props: {
        item: {
            type: Object,
            default: () => ({})
        },
        variant: {
            type: String,
            default: "elevated"
        }
    },
    data() {
        return {
            alert: false,
            dialogOpen: false,
            listId: null,
            loading: false,
            mdiAlert,
            mdiDelete
        };
    },
    methods: {
        async deleteItem() {
            this.loading = true;
            this.alert = false;
            try {
                if (this.item.imageID) {
                    await storage.deleteFile(
                        APPWRITE_IMAGE_BUCKET,
                        this.item.imageID
                    );
                }
                await databases.deleteDocument(
                    APPWRITE_DB,
                    APPWRITE_ITEM_COLLECTION,
                    this.item.$id
                );
            } catch (e) {
                if (e instanceof AppwriteException) {
                    this.alert = {
                        text: e.message,
                        title: "Error"
                    };
                } else {
                    this.alert = {
                        text: "An unknown error occurred.",
                        title: "Error"
                    };
                }
                this.loading = false;
                return;
            }

            this.$emit("removeItem", {
                item: this.item.$id
            });

            this.dialogOpen = false;
            this.loading = false;
        }
    }
};
</script>
