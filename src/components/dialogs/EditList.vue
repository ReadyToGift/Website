<template>
    <v-dialog
        :max-width="$vuetify.display.mobile ? '100%' : '90%'"
        :fullscreen="$vuetify.display.mobile ? true : false"
        v-model="dialogOpen"
        key="edit-list-dialog"
    >
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                :prepend-icon="mdiPencil"
                variant="outlined"
                color="primary"
                v-if="!$vuetify.display.mobile"
            >
                Edit
            </v-btn>
            <v-btn
                v-bind="activatorProps"
                :icon="mdiPencil"
                v-else
            />
        </template>

        <template v-slot:default="{ isActive }">
            <v-card title="Edit List">
                <v-card-text class="d-flex flex-column ga-4">
                    <ListFields
                        v-model:list="editedList"
                        :previousValues="previousValues"
                    />
                    <v-alert
                        v-if="alert"
                        type="error"
                        dismissible
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        :icon="mdiAlert"
                        :title="alert.title"
                        :text="alert.text"
                    />
                    <v-alert
                        v-if="!editedList.private && publicListLimitReached"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your public list allowance.<br/><br/>
                        Please upgrade to create unlimited public lists, or make some of your existing lists private.
                        <br/>
                        <v-btn
                            to="/dash/settings/billing"
                            color="warning"
                            class="mt-4"
                        >
                            Upgrade
                        </v-btn>
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-btn
                        text="Cancel"
                        @click="isActive.value = false"
                    />
                    <v-btn
                        color="primary"
                        text="Save"
                        @click="updateList"
                        variant="elevated"
                        :loading="loading"
                        :disabled="!editedList.private && publicListLimitReached"
                    />
                </v-card-actions>
            </v-card>
            {{ publicListLimitReached }}
        </template>
    </v-dialog>
</template>

<script>
import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, Permission, Query, Role } from "appwrite";
import { mdiAlert, mdiPencil } from "@mdi/js";
import { polar as polarStore, publicListLimitReached } from "@/stores/polar";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog } from "vuetify/components";
import { create as createDialog } from "@/stores/dialogs";
import { databases } from "@/appwrite";
import ListFields from "@/components/dialogs/fields/ListFields.vue";
import { userLists as userListsStore } from "@/stores/userLists";
import { user as userStore } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

export default {
    title: "ListDialog",
    components: {
        ListFields,
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
            user: useStore(userStore),
            createDialog,
            dialogOpen: false,
            editedList: {},
            listId: null,
            loading: false,
            mdiAlert,
            mdiPencil,
            polar: useStore(polarStore),
            previousValues: {},
            userLists: useStore(userListsStore),
            publicListLimitReached
        };
    },
    watch: {
        dialogOpen(open) {
            if (open === true) {
                this.editedList = {
                    currency: this.list.currency,
                    description: this.list.description,
                    itemCount: this.list.items.length,
                    private: this.list.private,
                    shortUrl: this.list.shortUrl,
                    title: this.list.title
                };
                this.previousValues = { ...this.editedList };
                this.listId = this.list.$id;
            } else {
                this.$emit("dialogClosed");

                this.alert = false;
                this.loading = false;
                this.editedList = {};
                this.previousValues = {};
            }
        }
    },
    methods: {
        async updateList() {
            this.alert = false;
            this.loading = true;

            if (this.editedList.private) {
                this.editedList.shortUrl = null;

                const resp = await this.createDialog({
                    actions: [
                        {
                            action: "close",
                            text: "Cancel",
                            variant: "text"
                        },
                        {
                            action: "close",
                            color: "primary",
                            text: "Continue",
                            variant: "elevated"
                        }
                    ],
                    async: true,
                    text: "Making your list private will remove its short URL, and delete any community-added items. Are you sure you want to proceed? Making a list public again will not restore these items.",
                    title: "Warning"
                });

                if (resp.action !== "Continue") {
                    this.loading = false;
                    return;
                }
            }

            if (this.editedList.shortUrl) {
                try {
                    const conflictingDocuments = await databases.listDocuments(
                        APPWRITE_DB,
                        APPWRITE_LIST_COLLECTION,
                        [
                            Query.equal("shortUrl", this.editedList.shortUrl),
                            Query.notEqual("$id", this.listId)
                        ]
                    );

                    if (conflictingDocuments.total !== 0) {
                        this.alert = {
                            text: "Short URL already in use.",
                            title: "Error"
                        };
                        this.loading = false;
                        return;
                    }
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

            let listResponse;

            try {
                let permissions = [
                    Permission.delete(Role.user(this.user.$id)),
                    Permission.update(Role.user(this.user.$id))
                ];

                if (this.editedList.private) {
                    permissions.push(Permission.read(Role.user(this.user.$id)));
                } else {
                    permissions.push(Permission.read(Role.any()));
                }
                listResponse = await databases.updateDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    this.listId,
                    this.editedList,
                    permissions
                );
            } catch (e) {
                console.log(e);
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

            this.$emit("updateList", {
                list: listResponse
            });

            if (this.previousValues.private !== this.editedList.private) {
                if (this.editedList.private) {
                    this.userLists.adjustCount(true, 1);
                    this.userLists.adjustCount(false, -1);
                } else {
                    this.userLists.adjustCount(false, 1);
                    this.userLists.adjustCount(true, -1);
                }
            }

            this.loading = false;
            this.dialogOpen = false;
        }
    }
};
</script>