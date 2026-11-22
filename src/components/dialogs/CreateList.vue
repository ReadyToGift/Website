<template>
    <v-dialog
        :max-width="
            listTypeSelected
                ? newList.type === 'wedding'
                    ? $vuetify.display.mobile
                        ? '100%'
                        : '500px'
                    : $vuetify.display.mobile
                      ? '100%'
                      : '90%'
                : $vuetify.display.mobile
                  ? '100%'
                  : '400px'
        "
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
            <v-card v-if="!listTypeSelected" title="Choose List Type">
                <v-card-text class="d-flex flex-column ga-4">
                    <v-btn
                        :prepend-icon="mdiFormatListBulleted"
                        variant="outlined"
                        size="large"
                        @click="selectListType('standard')"
                    >
                        Standard List
                    </v-btn>
                    <v-btn
                        :prepend-icon="mdiRing"
                        variant="outlined"
                        size="large"
                        @click="selectListType('wedding')"
                    >
                        Wedding Wishlist{{
                            weddingPrice ? ` (${weddingPrice})` : ""
                        }}
                    </v-btn>
                </v-card-text>
                <v-card-actions>
                    <v-btn text="Cancel" @click="isActive.value = false" />
                </v-card-actions>
            </v-card>
            <v-card
                v-else
                :title="
                    newList.type === 'wedding'
                        ? 'New Wedding Wishlist'
                        : 'New List'
                "
            >
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
                        v-if="newList.private && privateListLimitReached"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your private list allowance.<br><br>
                        Please make some of your other lists public, or delete
                        some of your lists.<br>
                        <template v-if="config.enableBilling">
                            <template v-if="!billing.isPro">
                                Alternatively, upgrade to create up to
                                {{
                                    allLimits.pro.privateLists > 0
                                        ? allLimits.pro.privateLists
                                        : "&infin;"
                                }}
                                private lists.
                                <br>
                                <v-btn
                                    to="/dash/settings/billing"
                                    color="warning"
                                    class="mt-4"
                                >
                                    Upgrade
                                </v-btn>
                            </template>
                            <template v-else>
                                Alternatively, contact support if you'd like
                                this limit raised.
                                <br>
                                <v-btn
                                    to="/contact"
                                    color="warning"
                                    class="mt-4"
                                >
                                    Contact
                                </v-btn>
                            </template>
                        </template>
                    </v-alert>
                    <v-alert
                        v-if="!newList.private && publicListLimitReached"
                        type="warning"
                        border="start"
                        class="mt-4 min-w-0 overflow-visible flex-shrink-1"
                        elevation="2"
                        variant="tonal"
                    >
                        You have reached your public list allowance.<br><br>
                        Please make some of your other lists private, or delete
                        some of your lists.<br>
                        <template v-if="config.enableBilling">
                            <template v-if="!billing.isPro">
                                Alternatively, upgrade to create up to
                                {{
                                    allLimits.pro.privateLists > 0
                                        ? allLimits.pro.privateLists
                                        : "&infin;"
                                }}
                                public lists.
                                <br>
                                <v-btn
                                    to="/dash/settings/billing"
                                    color="warning"
                                    class="mt-4"
                                >
                                    Upgrade
                                </v-btn>
                            </template>
                            <template v-else>
                                Alternatively, contact support if you'd like
                                this limit raised.
                                <br>
                                <v-btn
                                    to="/contact"
                                    color="warning"
                                    class="mt-4"
                                >
                                    Contact
                                </v-btn>
                            </template>
                        </template>
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-btn text="Cancel" @click="isActive.value = false" />
                    <v-btn
                        color="primary"
                        text="Create"
                        @click="createList"
                        variant="elevated"
                        :loading="loading"
                        :disabled="
                            (!newList.private && publicListLimitReached) ||
                            (newList.private && privateListLimitReached)
                        "
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { mdiAlert, mdiFormatListBulleted, mdiPlus, mdiRing } from "@mdi/js";
import { useStore } from "@nanostores/vue";
import {
    VAlert,
    VBtn,
    VCard,
    VCardActions,
    VCardText,
    VDialog,
} from "vuetify/components";
import ListFields from "@/components/dialogs/fields/ListFields.vue";
import {
    allLimits as allLimitsStore,
    billing as billingStore,
    getWeddingProduct,
    privateListLimitReached as privateListLimitReachedStore,
    publicListLimitReached as publicListLimitReachedStore,
} from "@/stores/billing";
import { config as configStore } from "@/stores/config";
import { userLists as userListsStore } from "@/stores/userLists";
import { formatMinorCurrency } from "@/stores/currency";
import { handleFetch } from "@/utils/handleFetch";

export default {
    title: "ListDialog",
    components: {
        ListFields,
        VAlert,
        VDialog,
        VCard,
        VCardText,
        VCardActions,
        VBtn,
    },
    props: {
        disabled: {
            type: Boolean,
            default: false,
        },
        list: {
            type: Object,
            default: () => ({}),
        },
        private: {
            type: Boolean,
            default: false,
        },
        variant: {
            type: String,
            default: "elevated",
        },
    },
    data() {
        return {
            config: useStore(configStore),
            alert: false,
            dialogOpen: false,
            listId: null,
            loading: false,
            listTypeSelected: false,
            weddingPrice: null,
            mdiAlert,
            mdiPlus,
            newList: {
                currency: "USD",
                description: "",
                private: this.private,
                shortUrl: null,
                title: "",
                spoilSurprises: false,
                type: "standard",
            },
            publicListLimitReached: useStore(publicListLimitReachedStore),
            privateListLimitReached: useStore(privateListLimitReachedStore),
            userLists: useStore(userListsStore),
            billing: useStore(billingStore),
            allLimits: useStore(allLimitsStore),
        };
    },
    mounted() {
        if (this.config.enableBilling) this.loadWeddingPrice();
    },
    watch: {
        dialogOpen(open) {
            if (open === true) {
                this.listId = this.list.id;
                this.newList.private = this.private;
                this.listTypeSelected = false;
            } else {
                this.alert = false;
                this.loading = false;
                this.listTypeSelected = false;
                this.newList = {
                    currency: "USD",
                    description: "",
                    private: false,
                    shortUrl: null,
                    spoilSurprises: false,
                    title: "",
                    type: "standard",
                };
            }
        },
    },
    methods: {
        async loadWeddingPrice() {
            try {
                const product = await getWeddingProduct();
                const price = product?.price;

                if (price?.price_amount != null && price.price_currency) {
                    const formattedPrice = formatMinorCurrency(
                        price.price_amount,
                        price.price_currency,
                    );
                    this.weddingPrice = price.recurring_interval
                        ? `${formattedPrice}/${price.recurring_interval}`
                        : formattedPrice;
                }
            } catch (error) {
                console.error("Failed to load wedding list pricing:", error);
            }
        },
        async createList() {
            this.alert = false;
            this.loading = true;
            if (this.newList.title === "") {
                this.alert = {
                    text: "Title is required.",
                    title: "Error",
                };
                this.loading = false;
                return;
            }

            if (this.newList.type === "wedding") {
                this.newList.private = true;
                this.newList.spoilSurprises = false;
                if (!this.newList.shortUrl) {
                    this.alert = {
                        text: "A short URL is required for wedding wishlists.",
                        title: "Error",
                    };
                    this.loading = false;
                    return;
                }
            }

            const [createListData, createListError] = await handleFetch(
                "/api/content/list",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...this.newList,
                    }),
                },
            );

            if (createListError) {
                this.alert = {
                    text:
                        createListError.message || "An unknown error occurred.",
                    title: "Error",
                };
                this.loading = false;
                return;
            }
            this.$emit("createList", {
                list: createListData.list,
            });

            this.newList = {
                currency: "USD",
                description: "",
                private: false,
                shortUrl: "",
                spoilSurprises: false,
                title: "",
                type: "standard",
            };

            this.dialogOpen = false;
            this.loading = false;
        },
        selectListType(type) {
            this.newList.type = type;
            this.listTypeSelected = true;
        },
    },
};
</script>
