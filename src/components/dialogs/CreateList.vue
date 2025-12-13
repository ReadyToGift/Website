<template>
    <v-dialog
        :max-width="$vuetify.display.mobile ? '100%' : '90%'"
        :fullscreen="$vuetify.display.mobile ? true : false"
        v-model="dialogOpen"
    >
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                :append-icon="mdiPlus"
                base-color="primary"
                :variant="variant"
                :disabled="disabled"
                title="Create a new list"
                size="large"
                rounded="pill"
                v-if="!$vuetify.display.mobile"
            >
                Create List
            </v-btn>
            <v-btn
                v-bind="activatorProps"
                :icon="mdiPlus"
                base-color="primary"
                :variant="variant"
                :disabled="disabled"
                title="Create a new list"
                rounded="pill"
                v-else
            />
        </template>

        <template v-slot:default="{ isActive }">
            <v-card title="New List">
                <v-card-text>
                    <ListFields v-model:list="newList" />
                    <v-alert
                        v-if="alert"
                        type="error"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        :icon="mdiAlert"
                        :title="alert.title"
                        :text="alert.text"
                    />
                    <v-alert
                        v-if="!newList.private && polar.publicListLimitReached"
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
                            to="/dash/billing"
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
                        text="Create"
                        @click="createList"
                        variant="elevated"
                        :loading="loading"
                        :disabled="!newList.private && polar.publicListLimitReached"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, ID, Permission, Query, Role } from "appwrite";
import { mdiAlert, mdiPlus } from "@mdi/js";
import { databases } from "@/appwrite";
import ListFields from "@/components/dialogs/fields/ListFields.vue";
import { usePolarStore } from "@/stores/polar";
import { useUserLists } from "@/stores/userLists";

export default {
    title: "ListDialog",
    props: {
        disabled: {
            type: Boolean,
            default: false
        },
        list: {
            type: Object,
            default: () => ({})
        },
        private: {
            type: Boolean,
            default: false
        },
        variant: {
            type: String,
            default: "elevated"
        }
    },
    components: {
        ListFields
    },
    data() {
        return {
            alert: false,
            // auth: useAuthStore(),
            dialogOpen: false,
            listId: null,
            loading: false,
            mdiAlert,
            mdiPlus,
            newList: {
                currency: "USD",
                description: "",
                private: this.private,
                shortUrl: null,
                title: ""
            },
            polar: usePolarStore(),
            userLists: useUserLists()
        };
    },
    watch: {
        dialogOpen(open) {
            if (open === true) {
                this.listId = this.list.$id;
                this.newList.private = this.private;
            } else {
                this.alert = false;
                this.loading = false;
                this.newList = {
                    currency: "USD",
                    description: "",
                    private: false,
                    shortUrl: null,
                    title: ""
                };
            }
        }
    },
    methods: {
        async createList() {
            let list;
            this.alert = false;
            this.loading = true;
            if (this.newList.title === "") {
                this.alert = {
                    text: "Title is required.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            if (this.newList.shortUrl) {
                try {
                    const conflictingDocuments = await databases.listDocuments(
                        APPWRITE_DB,
                        APPWRITE_LIST_COLLECTION,
                        [Query.equal("shortUrl", this.newList.shortUrl)]
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

            try {
                let permissions = [
                    Permission.delete(Role.user(this.auth.user.$id)),
                    Permission.update(Role.user(this.auth.user.$id))
                ];

                if (this.newList.private) {
                    permissions.push(
                        Permission.read(Role.user(this.auth.user.$id))
                    );
                } else {
                    permissions.push(
                        Permission.read(Role.any())
                    );
                }

                list = await databases.createDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    ID.unique(),
                    {
                        ...this.newList,
                        author: this.auth.user.$id,
                        authorName: this.auth.user.name,
                        itemCount: 0
                    },
                    permissions
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

            this.$emit("createList", {
                list
            });

            this.newList = {
                description: "",
                shortUrl: "",
                title: ""
            };

            this.dialogOpen = false;
            this.loading = false;
        }
    }
};
</script>
