<template>
    <v-dialog
        :max-width="$vuetify.display.mobile ? '100%' : '500px'"
        v-model="dialogOpen"
        scrollable
    >
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                :icon="mdiFileDocumentArrowRight"
                :variant="variant"
            />
        </template>

        <template v-slot:default="{ isActive }">s
            <template v-if="!success">
                <v-card title="Move Item">
                    <template v-slot:title>
                        Move Item
                        <v-card-text class="pa-0 pt-2">
                            What list would you like to move this item to?
                        </v-card-text>
                    </template>
                    <v-card-text>
                        <div
                            class="lists mt-5 loader"
                            v-if="loading"
                        >
                            <v-skeleton-loader
                                :height="50"
                                class="mb-4 pa-4"
                                v-for="i in 5"
                                :key="i"
                            />
                        </div>
                        <div
                            class="lists mt-5"
                            v-else
                        >
                            <ListCard
                                v-for="list in lists"
                                :key="list.$id"
                                :list="list"
                                :selected="selectedList === list"
                                @click="selectList(list)"
                                type="selectable"
                                :own-list="true"
                            />
                        </div>
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
                            color="primary"
                            text="Move"
                            @click="moveToList"
                            variant="elevated"
                            :disabled="selectedList === null"
                            :loading="loadingMove"
                        />
                    </v-card-actions>
                </v-card>
            </template>
            <template v-else>
                <v-card title="Item Moved">
                    <template v-slot:title> Item Moved </template>
                    <v-card-text> The item has been moved to the selected list. </v-card-text>
                    <v-card-actions>
                        <v-btn
                            @click="goToList"
                            text="View List"
                        />
                        <v-btn
                            text="Close"
                            color="primary"
                            variant="elevated"
                            @click="closeAfterSuccess"
                        />
                    </v-card-actions>
                </v-card>
            </template>
        </template>
    </v-dialog>
</template>

<script>
import { mdiAlert, mdiFileDocumentArrowRight } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog, VSkeletonLoader } from "vuetify/components";
import { ENABLE_BILLING } from "astro:env/client";
import { handleAuthFetch } from "@/utils/authFetch";
import ListCard from "../ListCard.vue";

import { allLimits as allLimitsStore, limits as limitsStore } from "@/stores/billing";
import { user as userStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";
import { useStore } from "@nanostores/vue";

export default {
    title: "ListDialog",
    components: {
        ListCard,
        VDialog,
        VBtn,
        VCard,
        VCardText,
        VCardActions,
        VAlert,
        VSkeletonLoader
    },
    props: {
        item: {
            type: Object,
            default: () => ({})
        },
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
            lists: [],
            loading: false,
            loadingMove: false,
            mdiAlert,
            mdiFileDocumentArrowRight,
            selectedList: null,
            success: false,
            user: useStore(userStore),
            limits: useStore(limitsStore),
            allLimits: useStore(allLimitsStore)
        };
    },
    watch: {
        dialogOpen(value) {
            if (value) {
                this.getLists();
            }
        }
    },
    methods: {
        closeAfterSuccess() {
            this.dialogOpen = false;
            this.$emit("removeItem", this.item.$id);
        },
        async getLists() {
            this.loading = true;
            try {
                const [response, listsError] = await handleAuthFetch("/api/content/lists");

                if (listsError?.status === 401) {
                    this.alert = {
                        text: "You must be logged in to move an item.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                if (listsError) {
                    this.alert = {
                        text: listsError.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                const userLists = (response.lists || [])
                    .filter((list) => list.author === this.user.$id && list.$id !== this.list.$id)
                    .sort((a, b) => new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime());

                if (userLists.length === 0) {
                    this.alert = {
                        text: "You have no other lists to move this item to.",
                        title: "No lists"
                    };
                    this.loading = false;
                    return;
                }

                this.lists = userLists;

                this.loading = false;
            } catch (e) {
                console.error(e);
                this.alert = {
                    text: e.message || "An unknown error occurred.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }
        },
        async moveToList() {
            this.loadingMove = true;

            try {
                const [, moveItemError] = await handleAuthFetch("/api/content/item", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        itemId: this.item.$id,
                        updateData: {
                            list: this.selectedList.$id
                        }
                    })
                });

                if (moveItemError?.status === 401) {
                    this.alert = {
                        text: "You must be logged in to move an item.",
                        title: "Error"
                    };
                    this.loadingMove = false;
                    return;
                }

                if (moveItemError) {
                    this.alert = {
                        text: moveItemError.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loadingMove = false;
                    return;
                }

                this.loadingMove = false;
                this.success = true;
            } catch (error) {
                console.error(error);
                this.alert = {
                    text: error.message || "An unknown error occurred.",
                    title: "Error"
                };
                this.loadingMove = false;
                return;
            }
        },
        goToList() {
            this.$router.push(`/list/${this.selectedList.$id}`);
            this.dialogOpen = false;
        },
        selectList(list) {
            if (list.itemCount + 1 >= this.limits.itemsPerList) {
                this.selectedList = null;
                createDialog(
                    ENABLE_BILLING
                        ? {
                            actions: [
                                {
                                    action: "close",
                                    color: "primary",
                                    text: "OK"
                                },
                                {
                                    to: "/dash/settings/billing",
                                    color: "secondary",
                                    closeAfterAction: true,
                                    text: "Upgrade"
                                }
                            ],
                            text: `This list has reached its limit of ${this.limits.itemsPerList}.`,
                            title: "You cannot add any more items into this list"
                        }
                        : {
                            actions: [
                                {
                                    action: "close",
                                    color: "primary",
                                    text: "OK"
                                }
                            ],
                            text: `This list has reached its limit of ${this.limits.itemsPerList}. Please remove an item from that list before moving another item into it.`,
                            title: "You cannot add any more items into this list"
                        }
                );
                return;
            } else {
                this.alert = false;
            }
            if (this.selectedList && this.selectedList.$id === list.$id) {
                this.selectedList = null;
                return;
            }
            this.selectedList = list;
        }
    }
};
</script>
