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
import { APPWRITE_DB, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, Permission, Query, Role  } from "appwrite";
import { mdiAlert, mdiFileDocumentArrowRight } from "@mdi/js";
import { databases } from "@/appwrite";
import ListCard from "../ListCard.vue";

import { user as userStore } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

export default {
    title: "ListDialog",
    components: {
        ListCard
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
            user: useStore(userStore)
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
                const response = await databases.listDocuments(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    [
                        Query.equal("author", this.user.$id),
                        Query.orderDesc("$updatedAt"),
                        Query.notEqual("$id", this.list.$id),
                        Query.select(["*","items.*"]),
                        Query.limit(1000)
                    ]
                );

                if (response.total === 0) {
                    this.alert = {
                        text: "You have no other lists to move this item to.",
                        title: "No lists"
                    };
                    this.loading = false;
                    return;
                }

                this.lists = response.documents;

                this.loading = false;
            } catch (e) {
                console.error(e);
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
        },
        async moveToList() {
            this.loadingMove = true;

            let permissions = [
                Permission.delete(Role.user(this.user.$id)),
                Permission.update(Role.user(this.user.$id))
            ];

            let privateListPermissions = [
                ...permissions,
                Permission.read(Role.user(this.user.$id))
            ];

            let publicListPermissions = [
                ...permissions,
                Permission.read(Role.any())
            ];

            try {
                await databases.updateDocument(
                    APPWRITE_DB,
                    APPWRITE_ITEM_COLLECTION,
                    this.item.$id,
                    {
                        list: this.selectedList.$id
                    },
                    this.selectedList.private
                        ? privateListPermissions
                        : publicListPermissions
                );

                await databases.updateDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    this.list.$id,
                    {
                        itemCount: this.list.items.length - 1
                    }
                );

                await databases.updateDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    this.selectedList.$id,
                    {
                        itemCount: this.selectedList.items.length + 1
                    }
                );

                this.loadingMove = false;
                this.success = true;
            } catch (error) {
                console.error(error);
                if (error instanceof AppwriteException) {
                    this.alert = {
                        text: error.message,
                        title: "Error"
                    };
                } else {
                    this.alert = {
                        text: "An unknown error occurred.",
                        title: "Error"
                    };
                }
                this.loadingMove = false;
                return;
            }
        },
        goToList() {
            window.location.href = `/list/${this.selectedList.$id}`;
            this.dialogOpen = false;
        },
        selectList(list) {
            if (this.selectedList && this.selectedList.$id === list.$id) {
                this.selectedList = null;
                return;
            }
            this.selectedList = list;
        }
    }
};
</script>
