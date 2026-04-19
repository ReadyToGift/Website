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
                        v-if="newList.private && privateListLimitReached.value"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your private list allowance.<br/><br/>
                        Please make some of your other lists public, or delete some of your lists.<br />
                        <template v-if="!prefs.pro">
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
                        v-if="!newList.private && publicListLimitReached.value"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your public list allowance.<br/><br/>
                        Please make some of your other lists private, or delete some of your lists.<br />
                        <template v-if="!prefs.pro">
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
                        text="Create"
                        @click="createList"
                        variant="elevated"
                        :loading="loading"
                        :disabled="(!newList.private && publicListLimitReached.value) || (newList.private && privateListLimitReached.value)"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { mdiAlert, mdiPlus } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog } from "vuetify/components";
import ListFields from "@/components/dialogs/fields/ListFields.vue";

import { allLimits as allLimitsStore, privateListLimitReached, publicListLimitReached } from "@/stores/billing";
import { $prefs } from "@/stores/prefs";
import { getJwt } from "@/stores/auth";
import { userLists as userListsStore } from "@/stores/userLists";
import { useStore } from "@nanostores/vue";


export default {
    title: "ListDialog",
    components: {
        ListFields,
        VAlert,
        VDialog,
        VCard,
        VCardText,
        VCardActions,
        VBtn
    },
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
    data() {
        return {
            alert: false,
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
            publicListLimitReached,
            privateListLimitReached,
            userLists: useStore(userListsStore),
            prefs: useStore($prefs),
            allLimits: useStore(allLimitsStore)
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

            const jwt = await getJwt();

            if (!jwt) {
                this.alert = {
                    text: "You must be logged in to create a list.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            const createListResp = await fetch("/api/content/list", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`
                },
                body: JSON.stringify({
                    ...this.newList
                })
            });

            const createListData = await createListResp.json();

            if (!createListResp.ok) {
                this.alert = {
                    text: createListData.message || "An unknown error occurred.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }
            this.$emit("createList", {
                list: createListData.list
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
