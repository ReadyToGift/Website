<template>
    <div
        class="page-content"
        v-if="!list && !newItem.notFound"
    >
        <v-skeleton-loader type="card" />
        <v-skeleton-loader type="card" />
        <v-skeleton-loader type="card" />
    </div>
    <div
        class="page-content"
        v-else-if="!newItem.notFound"
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
                        @loadList="loadList($event)"
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
        <div
            class="add-item-fab"
            v-if="$vuetify.display.mobile"
        >
            <ModifyItem
                :list="list"
                :currency="list.currency"
                :quickCreateURL="quickCreateURL"
                :wishlistOwner="wishlistOwner"
                @unsetQuickCreateURL="resetQuickCreateURL"
                @newItem="addItem"
                @updateList="updateList"
                v-if="auth.isLoggedIn"
            />
        </div>
    </div>
    <NotFound v-else />
</template>

<script>
import { APPWRITE_DB, APPWRITE_FULFILLMENT_COLLECTION, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { clientRouter } from "@/pages/_clientRouter";
import { databases } from "@/appwrite";
import ListCard from "@/components/ListCard.vue";
import ListItem from "@/components/ListItem.vue";
import { mdiInformation  } from "@mdi/js";
import ModifyItem from "@/components/dialogs/ModifyItem.vue";
import NotFound from "@/pages/_views/NotFound.vue";
import PWAPrompt from "@/components/PWAPrompt.vue";
import { Query } from "appwrite";
import { useAuthStore } from "@/stores/auth";
import { useCurrencyStore } from "@/stores/currency";
import { useDialogs } from "@/stores/dialogs";
import { useUserLists } from "@/stores/userLists";

export default {
    components: {
        ListCard,
        ListItem,
        ModifyItem,
        NotFound,
        PWAPrompt
    },
    data() {
        return {
            auth: useAuthStore(),
            avoidSpoilersDialogShown: false,
            communityItems: [],
            currency: useCurrencyStore(),
            dialogs: useDialogs(),
            fulfillments: [],
            list: false,
            loadedAsAuthor: false,
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
            userLists: useUserLists(),
            priceGroups: [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            pwaPromo: false,
            showFulfilled: localStorage.getItem("showFulfilled") !== "false",
            sort: "price"
        };
    },
    computed: {
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

                    const title = price === 0 ? "Flexible Gifts" : this.currency
                        .formatter(this.list.currency)
                        .format(lowerBound)
                        .split(".")[0] +
                        " - " +
                        this.currency
                            .formatter(this.list.currency)
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
            if (!this.auth.userPrefs.savedLists) return false;
            return this.auth.userPrefs.savedLists.includes(this.list.$id);
        },
        quickCreateURL() {
            if (!this.list) return "";
            const route = clientRouter.currentRoute.value;
            return route.query.quickcreateurl || "";
        },
        spoilSurprises() {
            return this.auth.userPrefs.spoilSurprises;
        },
        wishlistOwner() {
            return this.auth.isLoggedIn && this.auth.user.$id === this.list.author;
        }
    },
    methods: {
        resetQuickCreateURL() {
            const { quickcreateurl, ...remainingQueries } = Object.fromEntries(
                new URLSearchParams(window.location.search)
            );
            if (quickcreateurl) {
                const newQueryString = new URLSearchParams(remainingQueries).toString();
                const newURL =
                    window.location.pathname + (newQueryString ? `?${newQueryString}` : "");
                window.history.replaceState({}, document.title, newURL);
            }
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
                    const newItem = this.$el.querySelector(`[data-item-id="${data.item.$id}"]`);
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
                    const el = this.$el.querySelector(`[data-item-id="${data.item.$id}"]`);
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
                const el = this.$el.querySelector(`[data-item-id="${itemId}"]`);
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            });
        },
        async createAvoidSpoilersDialog(list) {
            if (this.avoidSpoilersDialogShown) return;
            if (!this.auth.user && this.auth.previouslyLoggedInUserID && list.author === this.auth.previouslyLoggedInUserID) {
                this.avoidSpoilersDialogShown = true;
                const dialogResponse = await this.dialogs.create({
                    actions: [
                        {
                            action: () => {
                                this.auth.removePreviouslyLoggedInUserID();
                            },
                            closeAfterAction: true,
                            color: "error",
                            text: "Continue Anyway",
                            variant: "text"
                        },
                        {
                            action: async () => {
                                await clientRouter.push({
                                    path: "/dash/login",
                                    query: { redirect: encodeURIComponent(clientRouter.currentRoute.value.fullPath) }
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

                return dialogResponse === "No";
            }
        },
        async loadList(listId) {
            try {
                let list = await databases.getDocument(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    listId,
                    [
                        Query.select(["*","items.*"])
                    ]
                );

                const communityItems = await databases.listDocuments(
                    APPWRITE_DB,
                    APPWRITE_ITEM_COLLECTION,
                    [
                        Query.equal("communityList", list.$id)
                    ]
                );

                this.communityItems = communityItems.documents;

                this.loadedAsAuthor = this.auth.user && list.author === this.auth.user.$id;

                this.avoidSpoilersDialogShown = await this.createAvoidSpoilersDialog(list);
                if (this.avoidSpoilersDialogShown) return;

                window.document.title = list.title + " - Readyto.gift";

                this.fulfillments = [];

                if (list.items && list.items.length) {
                    this.fulfillments = (await databases.listDocuments(
                        APPWRITE_DB,
                        APPWRITE_FULFILLMENT_COLLECTION,
                        [
                            Query.equal("item", list.items.map((item) => item.$id)),
                            Query.select(["*", "item.*"]),
                            Query.limit(list.items.length)
                        ]
                    )).documents;
                }

                list.items = list.items
                    .sort((a, b) => {
                        if (this.sort === "price") {
                            return a.price - b.price;
                        }
                        return a.title.localeCompare(b.title);
                    })
                    .map((item) => {
                        item.fulfillment = this.fulfillments.find(
                            (fulfillment) => {
                                return fulfillment.item.$id === item.$id;
                            }
                        );

                        return item;
                    });

                this.list = list;
                window.addEventListener("appinstalled", () => {
                    this.pwaPromo = false;
                });
            } catch (error) {
                if (error?.code === 404) {
                    this.newItem.notFound = true;
                    return;
                }
                console.error(error);
                this.dialogs.create({
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
        }
    },
    watch: {
        showFulfilled(val) {
            localStorage.setItem("showFulfilled", val);
        }
    },
    async mounted() {
        const route = clientRouter.currentRoute.value;
        const { listId } = route.params;
        await this.loadList(listId);

        if (this.loadedAsAuthor) {
            this.auth.$subscribe(async (mutation, state) => {
                if (!state.user && this.loadedAsAuthor) {
                    console.log("Creating avoid spoilers dialog");
                    await this.createAvoidSpoilersDialog(this.list);
                    this.loadedAsAuthor = false;
                }
            });
        }

        if (this.auth.isLoggedIn) {
            const lists = await databases.listDocuments(
                APPWRITE_DB,
                APPWRITE_LIST_COLLECTION,
                [
                    Query.equal("author", this.auth.user.$id)
                ]
            );

            const publicLists = lists.documents.filter((list) => !list.private);
            const privateLists = lists.documents.filter((list) => list.private);

            this.userLists.setCount({
                private: privateLists.length,
                public: publicLists.length
            });
        }
    }
};
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
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
    }
}
</style>
