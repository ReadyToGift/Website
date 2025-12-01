<template>
    <div class="page-content">
        <v-alert
            type="warning"
            border="start"
            elevation="32"
            :icon="mdiInformation"
            title="Verification Required"
            text="Please verify your email address to create lists."
            class="mb-4"
            v-if="auth?.user?.emailVerification === false"
        >
            <v-card-actions>
                <v-btn
                    variant="outlined"
                    @click="verifyEmail"
                > Send Verification Email </v-btn>
                <v-dialog
                    max-width="500"
                    v-model="verificationDialog"
                >
                    <v-card>
                        <v-card-text>
                            A verification email has been sent to {{ auth.user.email }}. Please
                            check your inbox and spam folder, the link will be valid for 7 days.
                        </v-card-text>

                        <v-card-actions>
                            <v-spacer />

                            <v-btn
                                text="Close"
                                @click="verificationDialog = false"
                            />
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </v-card-actions>
        </v-alert>
        <PWAPrompt />
        <v-card
            color="surface"
            variant="flat"
            class="pa-0 mb-4"
        >
            <v-card-item class="px-0">
                <template v-slot:title>
                    <h1 class="mb-0">Your lists</h1>
                </template>
                <template v-slot:append>
                    <CreateList
                        @createList="createList"
                        :disabled="auth?.user?.emailVerification === false"
                        :private="tab === 'private'"
                    />
                </template>
            </v-card-item>
            <v-card-text
                class="px-0"
                v-if="auth.userPrefs.listSorting"
            >
                <div class="sorting">
                    <v-btn-group
                        variant="tonal"
                        divided
                    >
                        <v-btn ref="sortTypeButton">
                            {{ auth?.userPrefs?.listSorting.type.name }}
                            <v-menu
                                activator="parent"
                                location="bottom start"
                                transition="fade-transition"
                            >
                                <v-list
                                    variant="tonal"
                                    rounded="xl"
                                    :items="sorting.typeOptions"
                                    item-title="name"
                                    item-value="value"
                                    class="py-0 mt-2"
                                    return-object=""
                                    @update:selected="setSortType"
                                />
                            </v-menu>
                        </v-btn>
                        <v-btn
                            :icon="
                                auth?.newUserPrefs?.listSorting.order === 'asc'
                                    ? mdiSortAscending
                                    : mdiSortDescending
                            "
                            @click="toggleSortDirection"
                        />
                    </v-btn-group>
                    <v-select
                        :items="sorting.typeOptions"
                        item-title="text"
                        item-value="value"
                        v-model="auth.newUserPrefs.listSorting.type"
                        return-object
                        hide-details
                        :menu-props="{
                            activator: $refs.sortTypeButton,
                            closeOnClick: true
                        }"
                        v-show="false"
                    />
                </div>
            </v-card-text>
        </v-card>
        <v-card
            variant="tonal"
            class="mb-4"
            v-if="quickCreateURL"
        >
            <v-card-text>
                <p>Select or create a list to add the following item to:</p>
                <strong>URL:</strong> {{ quickCreateURL }}
            </v-card-text>
        </v-card>
        <div
            class="loaders"
            v-if="loading"
        >
            <v-skeleton-loader type="list-item-two-line" />
            <v-skeleton-loader type="list-item-two-line" />
            <v-skeleton-loader type="list-item-two-line" />

            <v-card
                class="pa-0 mb-4"
                variant="flat"
                color="surface"
            >
                <v-card-item class="px-0">
                    <template v-slot:title>
                        <h2 class="mb-0">Saved lists</h2>
                    </template>
                    <template v-slot:prepend>
                        <v-icon>{{ mdiStar }}</v-icon>
                    </template>
                </v-card-item>
            </v-card>

            <v-skeleton-loader type="list-item-two-line" />
            <v-skeleton-loader type="list-item-two-line" />
            <v-skeleton-loader type="list-item-two-line" />
        </div>


        <v-sheet
            elevation="0"
            v-else-if="!loading"
        >
            <v-tabs
                color="primary"
                v-model="tab"
                :stacked="$vuetify.display.mobile"
                :align-tabs="$vuetify.display.mobile ? 'center' : 'left'"
            >
                <v-tab
                    value="public"
                    :prepend-icon="mdiEarth"
                >
                    Public {{ $vuetify.display.mobile ? '' : 'Lists' }}
                    <v-chip
                        rounded="pill"
                        variant="tonal"
                        class="ml-4"
                    >
                        {{ userLists.listCount.public }}
                        <template v-if="polar.publicListLimit">
                            / {{ polar.publicListLimit }}
                        </template>
                    </v-chip>
                </v-tab>
                <v-tab
                    value="private"
                    :prepend-icon="mdiLock"
                >
                    Private {{ $vuetify.display.mobile ? '' : 'Lists' }}
                    <v-chip
                        rounded="pill"
                        variant="tonal"
                        class="ml-4"
                    >
                        {{ userLists.listCount.private }}
                    </v-chip>
                </v-tab>
                <v-tab
                    value="saved"
                    :prepend-icon="mdiStar"
                    :disabled="!!quickCreateURL"
                >
                    Saved {{ $vuetify.display.mobile ? '' : 'Lists' }}
                    <v-chip
                        rounded="pill"
                        variant="tonal"
                        class="ml-4"
                    >
                        {{ savedLists.length }}
                    </v-chip>
                </v-tab>
            </v-tabs>

            <v-divider/>

            <v-tabs-window v-model="tab">
                <v-tabs-window-item
                    value="public"
                >
                    <v-list>
                        <ListCard
                            v-for="list in publicLists"
                            :key="list.$id"
                            :list="list"
                            :quickCreateURL="quickCreateURL"
                            :ownList="auth.isLoggedIn && list.author === auth.user.$id"
                        />
                    </v-list>
                    <v-alert
                        v-if="publicLists.length === 0"
                        type="info"
                        border="start"
                        dense
                    >
                        There are no public lists available. Create a new list and make it
                        public to share it with others!
                    </v-alert>

                </v-tabs-window-item>
                <v-tabs-window-item value="private">
                    <v-list>
                        <ListCard
                            v-for="list in privateLists"
                            :key="list.$id"
                            :list="list"
                            :quickCreateURL="quickCreateURL"
                            :ownList="auth.isLoggedIn && list.author === auth.user.$id"
                        />
                    </v-list>
                    <v-alert
                        v-if="privateLists.length === 0"
                        type="info"
                        border="start"
                        dense
                    >
                        You have no private lists. Create one to keep it hidden from
                        others!
                    </v-alert>
                </v-tabs-window-item>
                <v-tabs-window-item value="saved">
                    <v-list>
                        <ListCard
                            v-for="list in savedLists"
                            :key="list.$id"
                            :list="list"
                            :quickCreateURL="quickCreateURL"
                            :ownList="auth.isLoggedIn && list.author === auth.user.$id"
                        />
                    </v-list>
                    <v-alert
                        v-if="savedLists.length === 0"
                        type="info"
                        border="start"
                        dense
                    >
                        You have no saved lists. Save lists to access them quickly from
                        here!
                    </v-alert>
                </v-tabs-window-item>
            </v-tabs-window>
        </v-sheet>
    </div>
</template>

<script>
import { account, databases } from "@/appwrite";
import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { mdiEarth, mdiInformation, mdiLock, mdiSortAscending, mdiSortDescending, mdiStar } from "@mdi/js";
import { clientRouter } from "@/pages/_clientRouter";
import CreateList from "@/components/dialogs/CreateList.vue";
import ListCard from "@/components/ListCard.vue";
import PWAPrompt from "@/components/PWAPrompt.vue";
import { Query } from "appwrite";
import { useAuthStore } from "@/stores/auth";
import { useDialogs } from "@/stores/dialogs";
import { usePolarStore } from "@/stores/polar";
import { useUserLists } from "@/stores/userLists";
import validation from "@/utils/validation";

export default {
    components: {
        CreateList,
        ListCard,
        PWAPrompt
    },
    data() {
        return {
            auth: useAuthStore(),
            dialogs: useDialogs(),
            lists: [],
            loading: true,
            mdiEarth,
            mdiInformation,
            mdiLock,
            mdiSortAscending,
            mdiSortDescending,
            mdiStar,
            polar: usePolarStore(),
            quickCreateURL: false,
            savedLists: [],
            sorting: {
                typeOptions: [
                    { name: "Title", value: "title" },
                    { name: "Last updated", value: "$updatedAt" },
                    { name: "Created", value: "$createdAt" },
                    { name: "Item Count", value: "itemCount" }
                ]
            },
            tab: "public",
            userLists: useUserLists(),
            verificationDialog: false
        };
    },
    computed: {
        privateLists() {
            return this.lists.filter((list) => list.private);
        },
        publicLists() {
            return this.lists.filter((list) => !list.private);
        }
    },
    methods: {
        createList(data) {
            const query = {};
            if (this.quickCreateURL) {
                query.quickcreateurl = this.quickCreateURL;
            }
            clientRouter.push({
                path: `/list/${data.list.$id}?` + new URLSearchParams(query).toString()
            });
        },
        async getLists() {
            this.loading = true;

            const listQuery = [
                this.auth.userPrefs.listSorting.order === "asc"
                    ? Query.orderAsc(this.auth.userPrefs.listSorting.type.value)
                    : Query.orderDesc(this.auth.userPrefs.listSorting.type.value)
            ];

            const authorQuery = Query.equal("author", this.auth.user.$id);

            if (this.auth.userPrefs?.savedLists.length) {
                listQuery.push(
                    Query.or([authorQuery, Query.equal("$id", this.auth.userPrefs.savedLists)])
                );
            } else {
                listQuery.push(authorQuery);
            }

            try {
                const lists = await databases.listDocuments(
                    APPWRITE_DB,
                    APPWRITE_LIST_COLLECTION,
                    listQuery
                );

                this.savedLists = lists.documents.filter((list) =>
                    this.auth.userPrefs.savedLists.includes(list.$id)
                );
                this.lists = lists.documents.filter(
                    (list) => !this.auth.userPrefs.savedLists.includes(list.$id)
                );

                this.userLists.setCount({
                    private: this.privateLists.length,
                    public: this.publicLists.length
                });

                this.loading = false;
            } catch (error) {
                this.dialogs.create({
                    actions: [
                        {
                            action: this.getLists,
                            closeAfterAction: true,
                            text: "Retry"
                        }
                    ],
                    text: error,
                    title: "Failed to load lists"
                });
            }
        },
        async setSortType(event) {
            this.auth.newUserPrefs.listSorting.type = event[0];
            await this.getLists();
            try {
                await this.auth.updatePrefs(this.auth.newUserPrefs);
            } catch {
                alert("Failed to update user prefs");
            }
        },
        async toggleSortDirection() {
            this.auth.newUserPrefs.listSorting.order =
                this.auth.newUserPrefs.listSorting.order === "asc" ? "desc" : "asc";
            await this.getLists();
            try {
                await this.auth.updatePrefs(this.auth.newUserPrefs);
            } catch {
                alert("Failed to update user prefs");
            }
        },
        async verifyEmail() {
            try {
                await account.createVerification("https://readyto.gift/dash/verify");

                this.verificationDialog = true;
            } catch (error) {
                alert(error);
            }
        }
    },
    async mounted() {
        await this.getLists();

        // Handle quick create URL query
        const { title, text, url } = Object.fromEntries(
            new URLSearchParams(window.location.search)
        );

        if (!title && !text && !url) return;

        if (!url) {
            if (text.match(validation.urlRegexGlobal)) {
                this.quickCreateURL = text.match(validation.urlRegexGlobal)[0];
            } else if (title.match(validation.urlRegexGlobal)) {
                this.quickCreateURL = title.match(validation.urlRegexGlobal)[0];
            }
        } else {
            this.quickCreateURL = url;
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

        h1,
        h2 {
            word-break: break-word;
            white-space: pre-wrap;
        }
    }
}
</style>
