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
            variant="tonal"
            v-if="user?.emailVerification === false"
        >
            <v-card-actions>
                <v-btn
                    @click="verifyEmail"
                    color="warning"
                    variant="elevated"
                > Send Verification Email </v-btn>
                <v-dialog
                    max-width="500"
                    v-model="verificationDialog"
                >
                    <v-card>
                        <v-card-text>
                            A verification email has been sent to {{ auth.user.value.email }}. Please
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
                        :disabled="user?.emailVerification === false"
                        :private="tab === 'private'"
                    />
                </template>
            </v-card-item>
            <v-card-text
                class="px-0"
                v-if="prefs.listSorting"
            >
                <div class="sorting">
                    <v-btn-group
                        variant="tonal"
                        divided
                    >
                        <v-btn ref="sortTypeButton">
                            {{ prefs.listSorting.type.name }}
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
                                newUserPrefs?.listSorting.order === 'asc'
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
                        v-model="newUserPrefs.listSorting.type"
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
                            :ownList="user && list.author === user.$id"
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
                            :ownList="user && list.author === user.$id"
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
                            :ownList="false"
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

<script setup>
import { account, tablesDB } from "@/appwrite";
import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { computed, ref } from "vue";
import { mdiEarth, mdiInformation, mdiLock, mdiSortAscending, mdiSortDescending, mdiStar } from "@mdi/js";
import { VAlert, VBtn, VBtnGroup, VCard, VCardActions, VCardItem, VCardText, VDialog, VDivider, VIcon, VList, VMenu, VSelect, VSheet, VSkeletonLoader, VSpacer, VTab, VTabs, VTabsWindow, VTabsWindowItem } from "vuetify/components";
import { Query } from "appwrite";

import { $prefs, updatePrefs as updateUserPrefs } from "@/stores/prefs";
import auth from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";
import { useRouter } from "vue-router";
import { useStore } from "@nanostores/vue";

import CreateList from "@/components/dialogs/CreateList.vue";
import ListCard from "@/components/ListCard.vue";
import PWAPrompt from "@/components/PWAPrompt.vue";
import { polar as polarStore } from "@/stores/polar";
import { setCount as setListsCount, userLists as userListsStore } from "@/stores/userLists";
import validation from "@/utils/validation";

const router = useRouter();
const prefs = useStore($prefs);
const user = useStore(auth.user);
const polar = useStore(polarStore);
const userLists = useStore(userListsStore);

const props = defineProps({
    title: {
        type: String,
        default: null
    },
    text: {
        type: String,
        default: null
    },
    url: {
        type: String,
        default: null
    }
});

const newUserPrefs = ref($prefs.get());

const lists = ref([]);
const loading = ref(true);
const quickCreateURL = ref(false);
const savedLists = ref([]);
const sorting = ref({
    typeOptions: [
        { name: "Title", value: "title" },
        { name: "Last updated", value: "$updatedAt" },
        { name: "Created", value: "$createdAt" },
        { name: "Item Count", value: "itemCount" }
    ]
});
const tab = ref("public");
const verificationDialog = ref(false);

const privateLists = computed(() => {
    return lists.value.filter((list) => list.private);
});

const publicLists = computed(() => {
    return lists.value.filter((list) => !list.private);
});

const createList = (data) => {
    const query = {};
    if (quickCreateURL.value) {
        query.quickCreateURL = quickCreateURL.value;
    }
    const urlSearchParams = new URLSearchParams(query).toString();
    if (urlSearchParams.length) {
        router.push(`/list/${data.list.$id}?` + urlSearchParams);
        return;
    }
    router.push(`/list/${data.list.$id}`);
};

const getLists = async () => {
    if (!user.value) {
        console.error("User not loaded yet");
        return;
    }
    
    loading.value = true;

    const listQuery = [
        Query.limit(1000),
        prefs.value.listSorting.order === "asc"
            ? Query.orderAsc(prefs.value.listSorting.type.value)
            : Query.orderDesc(prefs.value.listSorting.type.value)
    ];

    const authorQuery = Query.equal("author", user.value.$id);

    if (prefs.value.savedLists.length) {
        listQuery.push(
            Query.or([authorQuery, Query.equal("$id", prefs.value.savedLists)])
        );
    } else {
        listQuery.push(authorQuery);
    }

    try {
        const listsResponse = await tablesDB.listRows({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_LIST_COLLECTION,
            queries: listQuery
        });

        savedLists.value = listsResponse.rows.filter((list) =>
            prefs.value.savedLists?.includes(list.$id)
        );
        lists.value = listsResponse.rows.filter(
            (list) => !prefs.value.savedLists?.includes(list.$id)
        );

        setListsCount({
            private: privateLists.value.length,
            public: publicLists.value.length
        });

        loading.value = false;
    } catch (error) {
        console.log({ error });
        createDialog({
            actions: [
                {
                    action: getLists,
                    closeAfterAction: true,
                    text: "Retry"
                }
            ],
            text: error,
            title: "Failed to load lists"
        });
    }
};

const setSortType = async (event) => {
    newUserPrefs.value.listSorting.type = event[0];
    try {
        await updateUserPrefs(newUserPrefs.value);
        await getLists();
    } catch (error) {
        console.error({ error });
        alert("Failed to update user prefs");
    }
};

const toggleSortDirection = async () => {
    newUserPrefs.value.listSorting.order =
        newUserPrefs.value.listSorting.order === "asc" ? "desc" : "asc";
    try {
        await updateUserPrefs(newUserPrefs.value);
        await getLists();
    } catch (error) {
        console.error({ error });
        alert("Failed to update user prefs");
    }
};

const verifyEmail = async () => {
    try {
        await account.createVerification("https://readyto.gift/dash/verify");

        verificationDialog.value = true;
    } catch (error) {
        alert(error);
    }
};

try {
    await getLists();
} catch (error) {
    console.error("Failed to load lists:", error);
}

if (props.title || props.text || props.url) {
    if (!props.url) {
        if (props.text.match(validation.urlRegexGlobal)) {
            quickCreateURL.value = props.text.match(validation.urlRegexGlobal)[0];
        } else if (props.title.match(validation.urlRegexGlobal)) {
            quickCreateURL.value = props.title.match(validation.urlRegexGlobal)[0];
        }
    } else {
        quickCreateURL.value = props.url;
    }
}
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
