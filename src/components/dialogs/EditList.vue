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
                        v-if="editedList.private && privateListLimitReached.value"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your private list allowance.<br/><br/>
                        Please make some of your other lists public, or delete some of your lists.<br />
                        <template v-if="!billing.isPro">
                            Alternatively, upgrade to create up to {{ allLimits.pro.privateLists > 0 ? allLimits.pro.privateLists : "&infin;" }} private lists.
                            <br/>
                            <v-btn
                                to="/dash/settings/billing"
                                color="warning"
                                class="mt-4"
                            >
                                Upgrade
                            </v-btn>
                        </template>
                        <template v-else>
                            Alternatively, contact support if you'd like this limit raised.
                            <br/>
                            <v-btn
                                to="/contact"
                                color="warning"
                                class="mt-4"
                            >
                                Contact
                            </v-btn>
                        </template>
                        
                    </v-alert>
                    <v-alert
                        v-if="!editedList.private && publicListLimitReached.value"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your public list allowance.<br/><br/>
                        Please make some of your other lists private, or delete some of your lists.<br />
                        <template v-if="!billing.isPro">
                            Alternatively, upgrade to create up to {{ allLimits.pro.privateLists > 0 ? allLimits.pro.privateLists : "&infin;" }} public lists.
                            <br/>
                            <v-btn
                                to="/dash/settings/billing"
                                color="warning"
                                class="mt-4"
                            >
                                Upgrade
                            </v-btn>
                        </template>
                        <template v-else>
                            Alternatively, contact support if you'd like this limit raised.
                            <br/>
                            <v-btn
                                to="/contact"
                                color="warning"
                                class="mt-4"
                            >
                                Contact
                            </v-btn>
                        </template>
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
                        :disabled="(!editedList.private && publicListLimitReached.value) || (editedList.private && privateListLimitReached.value)"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { allLimits as allLimitsStore, billing as billingStore, privateListLimitReached, publicListLimitReached } from "@/stores/billing";
import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, Permission, Query, Role } from "appwrite";
import { mdiAlert, mdiPencil } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog } from "vuetify/components";
import { create as createDialog } from "@/stores/dialogs";
import { databases } from "@/appwrite";
import ListFields from "@/components/dialogs/fields/ListFields.vue";
import { adjustCount } from "@/stores/userLists";
import { getJwt, user as userStore } from "@/stores/auth";
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
            previousValues: {},
            publicListLimitReached,
            privateListLimitReached,
            allLimits: useStore(allLimitsStore),
            billing: useStore(billingStore)
        };
    },
    watch: {
        dialogOpen(open) {
            if (open === true) {
                this.editedList = {
                    currency: this.list.currency,
                    description: this.list.description,
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

            const jwt = await getJwt();
            if (!jwt) {
                this.alert = {
                    text: "You must be logged in to edit a list.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            const editedListResponse = await fetch("/api/content/list", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    listId: this.listId,
                    updateData: this.editedList
                })
            });

            const listResponse = await editedListResponse.json();

            if (!editedListResponse.ok) {
                this.alert = {
                    text: listResponse.message || "An unknown error occurred.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            this.$emit("updateList", {
                list: listResponse.list
            });

            if (this.previousValues.private !== this.editedList.private) {
                if (this.editedList.private) {
                    adjustCount(true, 1);
                    adjustCount(false, -1);
                } else {
                    adjustCount(false, 1);
                    adjustCount(true, -1);
                }
            }

            this.loading = false;
            this.dialogOpen = false;
        }
    }
};
</script>