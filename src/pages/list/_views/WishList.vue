<template>
    <div
        class="page-content loading"
        v-if="!list && !newItem.notFound"
    >
        <v-card
            variant="tonal"
            class="mb-5"
            width="80%"
        >
            <v-card-title>
                Loading
                <v-progress-circular
                    indeterminate
                    size="20"
                    width="2"
                    class="ml-2"
                    rounded
                />
            </v-card-title>
            <v-card-subtitle>
                {{ loading.status }}
            </v-card-subtitle>
            <v-card-text>
                <v-progress-linear
                    height="5"
                    color="primary"
                    :max="loading.max"
                    :model-value="Math.min(loading.value + 0.25, loading.max)"
                    :buffer-value="loading.bufferValue"
                />
            </v-card-text>
        </v-card>
    </div>
    <template v-else-if="!newItem.notFound">
        <div
            class="page-content"
        >
            <PWAPrompt class="mb-5"/>
            <ListCard
                :header="true"
                :list="list"
                :communityItems="communityItems"
                :spoilSurprises="spoilSurprises"
                :list-saved="listSaved"
                :quickCreateURL="quickCreateURL"
                :own-list="wishlistOwner"
                :itemLimitReached="itemLimitReached"
                @itemLimitReached="itemLimitReachedDialog"
                @quickCreate="quickCreate"
                @updateList="updateList"
                @newItem="addItem"
            />
            <div class="filters">
                <v-switch
                    label="Show Fulfilled"
                    v-model="showFulfilled"
                    color="primary"
                    inset
                    v-if="!wishlistOwner"
                />
            </div>
            <v-alert
                v-if="!wishlistOwner"
                type="info"
                :icon="mdiInformation"
                elevation="2"
                class="mt-5"
                text="Make sure to mark anything as Fulfilled if you've purchased or plan on purchasing any of the items on the list! This will not be shown to the owner of this list."
                color="primary"
            />

            <div
                class="items"
                v-if="itemsByPriceGroups && itemsByPriceGroups.length"
            >
                <div
                    class="item-price-group"
                    v-for="priceGroup in itemsByPriceGroups"
                    :key="priceGroup.price"
                >
                    <h3>{{ priceGroup.title }}</h3>
                    <v-divider />
                    <div class="item-price-group-items">
                        <ListItem
                            v-for="item in priceGroup.items"
                            :key="item.$id"
                            :item="item"
                            :list="list"
                            :wishlistOwner="wishlistOwner"
                            :currency="list.currency"
                            @removeItem="removeItem(item.$id)"
                            @editItem="editItem($event)"
                            @fulfillItem="fulfillItem($event)"
                            @unfulfillItem="unfulfillItem($event)"
                        />
                    </div>
                </div>
            </div>
            <div
                class="no-items"
                v-else
            >
                <v-spacer height="20" />
                <v-alert
                    type="info"
                    :icon="mdiInformation"
                    elevation="2"
                    class="mt-5"
                    color="primary"
                >
                    <template
                        v-slot:text
                        v-if="list.items && list.items.length"
                    >
                        Items exist on this list, but they've all been fulfilled. Lucky them!
                    </template>
                    <template
                        v-slot:text
                        v-else
                    >
                        No items currently exist in this list.
                        <template v-if="wishlistOwner"> Add some! </template>
                    </template>
                </v-alert>
            </div>
        </div>
        <div
            class="add-item-fab"
        >
            <ModifyItem
                :list="list"
                :currency="list.currency"
                :quickCreateURL="quickCreateURL"
                :wishlistOwner="wishlistOwner"
                :itemLimitReached="itemLimitReached"
                @itemLimitReached="itemLimitReachedDialog"
                @unsetQuickCreateURL="resetQuickCreateURL"
                @newItem="addItem"
                @updateList="updateList"
                v-if="user"
            />
        </div>
    </template>
    <NotFound v-else />
</template>

<script>
import { APPWRITE_DB, APPWRITE_FULFILLMENT_COLLECTION, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { avatars, databases, tablesDB } from "@/appwrite";
import { VAlert, VCard, VCardSubtitle, VCardText, VCardTitle, VDivider, VProgressCircular, VProgressLinear, VSpacer, VSwitch } from "vuetify/components";
import ListCard from "@/components/ListCard.vue";
import ListItem from "@/components/ListItem.vue";
import { mdiInformation  } from "@mdi/js";
import ModifyItem from "@/components/dialogs/ModifyItem.vue";
import NotFound from "../../404/_NotFound.vue";
import PWAPrompt from "@/components/PWAPrompt.vue";
import { Query } from "appwrite";

import { $prefs, addToHistory } from "@/stores/prefs";
import { previouslyLoggedInUserID as previouslyLoggedInUserIDStore, user as userStore } from "@/stores/auth";
import { setCount as setListCount, userLists as userListsStore } from "@/stores/userLists";
import { clientRouter } from "@/router";
import { create as createDialog } from "@/stores/dialogs";
import { formatter as currencyFormatter } from "@/stores/currency";
import { limits as limitsStore } from "@/stores/billing";
import { useStore } from "@nanostores/vue";

export default {
    components: {
        ListCard,
        ListItem,
        ModifyItem,
        VSwitch,
        VAlert,
        VDivider,
        VSpacer,
        VCard,
        VCardText,
        VCardTitle,
        VCardSubtitle,
        VProgressLinear,
        VProgressCircular,
        NotFound,
        PWAPrompt
    },
    data() {
        return {
            addToHistory,
            communityItems: [],
            currencyFormatter,
            createDialog,
            fulfillments: [],
            list: false,
            limits: useStore(limitsStore),
            loadedAsAuthor: false,
            loading: {
                value: 0,
                bufferValue: 0,
                max: 3,
                status: "Loading list"
            },
            mdiInformation,
            newItem: {
                description: "",
                image: "",
                price: 0,
                priority: "none",
                title: "",
                url: ""
            },
            notFound: false,
            userLists: useStore(userListsStore),
            priceGroups: [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            prefs: useStore($prefs),
            previouslyLoggedInUserID: useStore(previouslyLoggedInUserIDStore),
            showFulfilled: import.meta.env.SSR ? true : localStorage.getItem("showFulfilled") !== "false",
            sort: "price",
            user: useStore(userStore),
            quickCreateURL: null
        };
    },
    props: {
        listId: {
            type: String,
            required: false
        },
        quickCreateURLParam: {
            type: String,
            required: false
        }
    },
    computed: {
        itemLimitReached() {
            return this.wishlistOwner && this.list.itemCount >= this.limits.itemsPerList;
        },
        itemsByPriceGroups() {
            if (!this.list) return [];
            const items = [
                ...this.list.items,
                ...(!this.spoilSurprises && this.wishlistOwner ? [] : this.communityItems)
            ];

            if (!items || items.length === 0) return [];

            const priceGroupItems = this.priceGroups
                .map((price, index) => {
                    const lowerBound = index === 0 ? 0 : this.priceGroups[index - 1];
                    const upperBound = price;

                    const title = price === 0 ? "Flexible Gifts" : this.currencyFormatter(this.list.currency)
                        .format(lowerBound)
                        .split(".")[0] +
                        " - " +
                        this.currencyFormatter(this.list.currency)
                            .format(upperBound)
                            .split(".")[0];

                    return {
                        items: items
                            .filter((item) => {
                                if (
                                    !this.showFulfilled &&
                                    !this.wishlistOwner &&
                                    (item.fulfillment || item.communityList)
                                )
                                    return false; // skip it
                                if ((item.price >= lowerBound && item.price < upperBound && item.price !== 0) || (item.price === 0 && upperBound === 0)) {
                                    return item;
                                }
                            })
                            .sort((a, b) => {
                                if (!this.wishlistOwner) {
                                    if (a.fulfillment && !b.fulfillment) return 1;
                                    if (!a.fulfillment && b.fulfillment) return -1;
                                }

                                if (this.sort === "price") {
                                    return a.price - b.price;
                                }
                                return a.title.localeCompare(b.title);
                            }),
                        price,
                        title
                    };
                })
                .filter((priceGroup) => priceGroup.items.length);

            const itemsAboveLargestPriceGroup = items.filter((item) => {
                if (!this.showFulfilled && !this.wishlistOwner && item.fulfillment)
                    return false;
                if (item.price >= this.priceGroups[this.priceGroups.length - 1]) {
                    return item;
                }
            });

            if (itemsAboveLargestPriceGroup.length) {
                priceGroupItems.push({
                    items: itemsAboveLargestPriceGroup,
                    price: "above",
                    title:
                        this.currency
                            .formatter(this.list.currency)
                            .format(this.priceGroups[this.priceGroups.length - 1])
                            .split(".")[0] +
                        "+"
                });
            }
            return priceGroupItems;
        },
        listSaved() {
            if (!this.prefs.savedLists) return false;
            return this.prefs.savedLists.includes(this.listId);
        },
        spoilSurprises() {
            return this.prefs.spoilSurprises;
        },
        wishlistOwner() {
            return this.user && this.user.$id === this.list.author;
        }
    },
    methods: {
        resetQuickCreateURL() {
            const { quickCreateURL, ...remainingQueries } = Object.fromEntries(
                new URLSearchParams(window.location.search)
            );
            if (quickCreateURL) {
                const newQueryString = new URLSearchParams(remainingQueries).toString();
                const newURL =
                    window.location.pathname + (newQueryString ? `?${newQueryString}` : "");
                window.history.replaceState({}, document.title, newURL);
            }
        },
        itemLimitReachedDialog() {
            if (this.prefs.pro) {
                createDialog({
                    actions: [
                        {
                            action: "close",
                            color: "primary",
                            text: "Okay",
                            variant: "elevated"
                        },
                        {
                            to: "/contact",
                            closeAfterAction: true,
                            color: "secondary",
                            text: "Contact"
                        }
                    ],
                    text: `You have used ${this.list.itemCount}/${this.limits.itemsPerList} of your limit of items in a list
                    Please remove some items, or contact support if you'd like this limit raised.`,
                    title: "Item limit reached",
                    variant: "warning"
                });
            } else {
                createDialog({
                    actions: [
                        {
                            action: "close",
                            color: "primary",
                            text: "Okay",
                            variant: "elevated"
                        },
                        {
                            to: "/dash/settings/billing",
                            closeAfterAction: true,
                            color: "secondary",
                            text: "Upgrade"
                        }
                    ],
                    text: `You have used ${this.list.itemCount}/${this.limits.itemsPerList} of your limit of items in a list
                    Please remove some items, or upgrade your plan.`,
                    title: "Item limit reached",
                    variant: "warning"
                });
            }
        },
        quickCreate(url) {
            if (this.itemLimitReached) {
                this.itemLimitReachedDialog();
                return;
            }
            this.quickCreateURL = url;
        },
        async updateList(data) {
            this.list.title = data.list.title;
            this.list.description = data.list.description;
            this.list.currency = data.list.currency;
            this.list.shortUrl = data.list.shortUrl;
            this.list.itemCount = data.list.itemCount;
            this.list.$updatedAt = data.list.$updatedAt;
            this.list.private = data.list.private;
        },
        addItem(data) {
            if (data.item.communityList) {
                this.communityItems.push(data.item);
            } else {
                this.list.items.push(data.item);
            }
            this.showFulfilled = true;
            this.$nextTick(() => {
                setTimeout(() => {
                    const newItem = document.body.querySelector(`[data-item-id="${data.item.$id}"]`);
                    newItem.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 500);
            });
        },
        editItem(data) {
            if (data.item.communityList) {
                this.communityItems = this.communityItems.map((item) => {
                    if (item.$id === data.item.$id) {
                        return data.item;
                    }
                    return item;
                });
            } else {
                this.list.items = this.list.items.map((item) => {
                    if (item.$id === data.item.$id) {
                        return data.item;
                    }
                    return item;
                });
            }
            this.$nextTick(() => {
                setTimeout(() => {
                    const newItem = document.body.querySelector(`[data-item-id="${data.item.$id}"]`);
                    newItem.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 500);
            });
        },
        async removeItem(id) {
            if (this.communityItems.find((item) => item.$id === id)) {
                this.communityItems = this.communityItems.filter((item) => item.$id !== id);
                return;
            } else {
                this.list.items = this.list.items.filter((item) => item.$id !== id);

                const updatedList = await databases.updateDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    this.list.$id,
                    {
                        itemCount: this.list.items.length
                    }
                );

                this.updateList({ list: updatedList });
            }
        },
        fulfillItem(data) {
            this.list.items = this.list.items.map((item) => {
                if (item.$id === data.item.$id) {
                    item.fulfillment = data;
                }
                return item;
            });

            if (this.showFulfilled === true) {
                this.$nextTick(() => {
                    const el = document.body.querySelector(`[data-item-id="${data.item.$id}"]`);
                    el.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                });
            }
        },
        unfulfillItem(itemId) {
            this.list.items = this.list.items.map((item) => {
                if (item.$id === itemId) {
                    item.fulfillment = null;
                }
                return item;
            });

            this.$nextTick(() => {
                const el = document.body.querySelector(`[data-item-id="${itemId}"]`);
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            });
        },
        async createAvoidSpoilersDialog(list) {
            if (!this.user && this.previouslyLoggedInUserID && list.author === this.previouslyLoggedInUserID) {
                const dialogResponse = await this.createDialog({
                    actions: [
                        {
                            action: () => {
                                previouslyLoggedInUserIDStore.set(null);
                            },
                            closeAfterAction: true,
                            color: "error",
                            text: "Continue Anyway",
                            variant: "text"
                        },
                        {
                            action: async () => {
                                this.$router.push({ 
                                    path: "/dash/login", 
                                    query: { redirect: window.location.pathname + window.location.search }
                                });
                            },
                            closeAfterAction: true,
                            color: "primary",
                            text: "Log In",
                            variant: "elevated"
                        }
                    ],
                    async: true,
                    opaque: true,
                    persistent: true,
                    text: "It appears you may have created this list. Would you like to log in, to avoid spoilers?",
                    title: "Warning",
                    variant: "warning"
                });

                return dialogResponse.action === "Continue Anyway";
            }
            return true;
        },
        async getList ({ tablesDB, listId, sort = "price", user }) {
            this.loading = {
                ...this.loading,
                status: "Getting list",
                value: 0,
                bufferValue: 1
            };
            let list = await tablesDB.getRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: listId,
                queries: [Query.select(["*", "items.*"])]
            });

            this.loading = {
                ...this.loading,
                status: "Getting community items",
                value: 1,
                bufferValue: 2
            };

            console.log("Loading community items");
            const communityItems = (
                await tablesDB.listRows({
                    databaseId: APPWRITE_DB,
                    tableId: APPWRITE_ITEM_COLLECTION,
                    queries: [Query.equal("communityList", list.$id)]
                })
            ).rows;

            this.loading = {
                ...this.loading,
                status: "Getting fulfillments",
                value: 2,
                bufferValue: 3
            };

            const loadedAsAuthor = user && list.author === user.$id;

            let fulfillments = [];

            if (list.items && list.items.length) {
                console.log("Loading fulfillments");
                fulfillments = (
                    await tablesDB.listRows({
                        databaseId: APPWRITE_DB,
                        tableId: APPWRITE_FULFILLMENT_COLLECTION,
                        queries: [
                            Query.equal(
                                "item",
                                list.items.map((item) => item.$id)
                            ),
                            Query.select(["*", "item.*"]),
                            Query.limit(list.items.length)
                        ]
                    })
                ).rows;
            }

            this.loading = {
                ...this.loading,
                status: "Finishing up",
                value: 2,
                bufferValue: 3
            };

            list.items = list.items
                .sort((a, b) => {
                    if (sort === "price") {
                        return a.price - b.price;
                    }
                    return a.title.localeCompare(b.title);
                })
                .map((item) => {
                    item.fulfillment = fulfillments.find((fulfillment) => {
                        return fulfillment.item.$id === item.$id;
                    });

                    return item;
                });
            
            this.loading = {
                ...this.loading,
                status: "Getting community items",
                value: 3,
                bufferValue: 3
            };

            return {
                list,
                loadedAsAuthor,
                fulfillments,
                communityItems
            };
        },
        async setList({ listData }) {
            try {
                this.list = listData.list;
                this.loadedAsAuthor = listData.loadedAsAuthor;
                this.fulfillments = listData.fulfillments;
                this.communityItems = listData.communityItems;
                window.document.title = `${this.list.title} - Readyto.gift`;

                this.addToHistory({
                    avatar: avatars.getInitials(this.list.authorName),
                    id: this.list.$id,
                    subtitle: `By ${this.list.authorName}`,
                    title: this.list.title
                });
            } catch (error) {
                if (error?.code === 404) {
                    this.newItem.notFound = true;
                    return;
                }
                console.error(error);
                this.createDialog({
                    actions: [
                        {
                            action: "close",
                            color: "primary",
                            text: "OK"
                        }
                    ],
                    text: "An error occurred while trying to load this list. Please try again later. " + error.message,
                    title: "Error",
                    variant: "error"
                });
            }
        },
        async loadList(listId) {
            try {
                const listData = await this.getList({ listId, tablesDB, user: this.user });
                if (listData && listData.list) {
                    const continueAnyway = await this.createAvoidSpoilersDialog(listData.list);
                    if (!continueAnyway) {
                        return; // redirected to login
                    }
                }
                await this.setList({ listData });
                this.quickCreateURL = this.quickCreateURLParam;
            } catch (error) {
                if (error.code === 404) {
                    this.newItem.notFound = true;
                    return;
                }
            }
        }
    },
    watch: {
        showFulfilled(val) {
            localStorage.setItem("showFulfilled", val);
        },
        async listId() {
            this.list = false;
            this.newItem.notFound = false;
            this.loadList();
        }
    },
    async mounted() {
        const route = clientRouter.currentRoute.value;
        const { listId } = route.params;
        await this.loadList(listId);

        if (this.user) {
            const lists = await databases.listDocuments(
                APPWRITE_DB,
                APPWRITE_LIST_COLLECTION,
                [
                    Query.equal("author", this.user.$id)
                ]
            );

            const publicLists = lists.documents.filter((list) => !list.private);
            const privateLists = lists.documents.filter((list) => list.private);

            setListCount({
                private: privateLists.length,
                public: publicLists.length
            });
        }
        clientRouter.afterEach(async (to, from) => {
            if (to.params.listId !== from.params.listId && to.params.listId) {
                this.list = false;
                this.communityItems = [];
                this.fulfillments = [];
                this.avoidSpoilersDialogShown = false;
                await this.loadList(to.params.listId);
            }
        });
        this.quickCreateURL = this.quickCreateURLParam;
    }
};
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
        &.loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .list-header {
            padding: 1rem;
            h1 {
                word-break: break-word;
                white-space: pre-wrap;
            }

            .mobile-list-buttons {
                text-align: center;
            }
        }

        .filters {
            display: flex;
            justify-content: flex-end;
        }

        .items {
            margin-top: 1rem;
            .item-price-group {
                h3 {
                    font-size: 2rem;
                    margin-top: 2rem;
                }
                hr {
                    margin: 0.5rem 0 1rem;
                }
                .item-price-group-items {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
            }
        }
    }

    .add-item-fab {
        position: sticky;
        bottom: 1.5rem;
        right: 3rem;
        width: fit-content;
        margin-left: auto;
        padding-top: 1rem;
        
    }

    @media screen and (max-width: 768px) {
        .page-content {
            .list-header {
                h1 {
                    flex-direction: column;
                    align-items: start;
                }
            }
        }

        .add-item-fab {
            right: calc((100% - var(--section-width)) / 2);
        }
    }
}
</style>
