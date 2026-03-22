<template>
    <v-dialog
        :max-width="$vuetify.display.mobile ? '100%' : '500px'"
        :fullscreen="$vuetify.display.mobile ? true : false"
        v-model="dialogOpen"
        key="delete-list-dialog"
    >
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                :prepend-icon="mdiDelete"
                title="Delete List"
                color="error"
                variant="outlined"
                v-if="!$vuetify.display.mobile"
            >
                Delete
            </v-btn>
            <v-btn
                v-bind="activatorProps"
                :icon="mdiDelete"
                title="Delete List"
                color="error"
                v-else
            />
        </template>

        <template v-slot:default="{ isActive }">
            <v-card title="Delete List">
                <v-card-text>
                    Are you sure you want to delete this list?
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
                        @click="deleteList"
                        variant="elevated"
                        :loading="loading"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { databases, storage } from "@/appwrite";
import { mdiAlert, mdiDelete } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog } from "vuetify/components";
import { AppwriteException } from "appwrite";
import { clientRouter } from "@/router";
import { userLists as userListsStore } from "@/stores/userLists";
import { useStore } from "@nanostores/vue";

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
        list: {
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
            mdiDelete,
            userLists: useStore(userListsStore)
        };
    },
    watch: {
        dialogOpen(open) {
            if (open !== true) {
                this.$emit("dialogClosed");
            }
        }
    },
    methods: {
        async deleteList() {
            this.loading = true;
            this.alert = false;
            try {
                await Promise.all(
                    this.list.items.map(async (item) => {
                        if (item.imageID) {
                            await storage.deleteFile(
                                APPWRITE_IMAGE_BUCKET,
                                item.imageID
                            );
                        }
                        // List <=> Items are set to cascade delete in Appwrite console
                    })
                );

                await databases.deleteDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    this.list.$id
                );

                this.userLists.adjustCount(this.list.private, -1);

                clientRouter.push("/dash/lists");

                this.dialogOpen = false;
                this.loading = false;
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
        }
    }
};
</script>
