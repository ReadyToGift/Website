<template>
    <v-btn-group
        base-color="primary"
        divided
        rounded="pill"
        density="comfortable"
        size="small"
        :class="props.class"
    >
        <ModifyItem
            :list="list"
            :variant="variant"
            :currency="currency"
            :quickCreateURL="quickCreateURL"
            :wishlistOwner="wishlistOwner"
            @unsetQuickCreateURL="resetQuickCreateURL"
            @newItem="(data) => $emit('newItem', data)"
            @updateList="$emit('updateList', $event)"
            v-if="auth.isLoggedIn && !$vuetify.display.mobile"
        />

        <v-btn
            size="small"
            icon
            variant="outlined"
            v-if="wishlistOwner && !$vuetify.display.mobile"
            v-bind="menuOpen"
        >
            <v-icon :icon="mdiMenuDown" />

            <v-menu
                activator="parent"
                location="bottom end"
                transition="fade-transition"
                v-model="menuOpen"
            >
                <v-list
                    density="compact"
                    min-width="250"
                    rounded="lg"
                    slim
                >
                    <EditList
                        :list="list"
                        @updateList="$emit('updateList', $event)"
                        @dialogClosed="menuOpen = false"
                    />
                    <DeleteList
                        :list="list"
                        @dialogClosed="menuOpen = false"
                    />
                </v-list>
            </v-menu>
        </v-btn>

        <v-dialog
            :max-width="$vuetify.display.mobile ? '100%' : '500px'"
            v-model="quickcreateDialogOpen"
            v-if="wishlistOwner"
        >
            <template v-slot:activator>
                <v-btn
                    :icon="mdiClipboard"
                    variant="outlined"
                    @click="quickCreate"
                    v-if="$vuetify.display.mobile"
                />
                <v-btn
                    :prepend-icon="mdiClipboard"
                    variant="outlined"
                    @click="quickCreate"
                    v-else
                >
                    <template v-if="!$vuetify.display.mobile"> Quickcreate </template>
                </v-btn>
            </template>

            <template v-slot:default="{ isActive }">
                <v-card :title="quickCreateError.title">
                    <v-card-text>
                        {{ quickCreateError.text }}
                    </v-card-text>
                    <v-card-actions>
                        <v-btn
                            text="OK"
                            @click="isActive.value = false"
                        />
                    </v-card-actions>
                </v-card>
            </template>
        </v-dialog>

        <v-btn
            variant="outlined"
            :icon="mdiShare"
            @click="copyListURL"
            v-if="$vuetify.display.mobile && wishlistOwner"
        />

        <v-btn
            variant="outlined"
            :prepend-icon="mdiShare"
            @click="copyListURL"
            v-else
        >
            Share
        </v-btn>

        <v-btn
            :prepend-icon="listSaved ? mdiStarOff : mdiStar"
            :variant="listSaved ? 'tonal' : 'outlined'"
            v-if="!wishlistOwner"
            @click="saveList"
            :loading="listSaveLoading"
        >
            {{ listSaved ? "Unsave" : "Save" }}
        </v-btn>

        <v-snackbar
            v-model="shareButtonSnackbarOpen"
            :timeout="2000"
            color="primary"
            rounded="pill"
            timer
            text="Link copied to clipboard"
        />
    </v-btn-group>
</template>

<script setup>
import { mdiClipboard, mdiMenuDown, mdiShare, mdiStar, mdiStarOff } from "@mdi/js";
import { account } from "@/appwrite";
import DeleteList from "./DeleteList.vue";
import EditList from "./EditList.vue";
import ModifyItem from "./ModifyItem.vue";
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useDialogs } from "@/stores/dialogs";
import validation from "@/utils/validation";

const auth = useAuthStore();
const dialogs = useDialogs();

const shareButtonSnackbarOpen = ref(false);

const menuOpen = ref(false);

defineEmits(["newItem", "updateList"]);

const props = defineProps({
    class: {
        default: "",
        type: String
    },
    currency: {
        required: true,
        type: String
    },
    list: {
        default: () => ({}),
        type: Object
    },
    listSaved: {
        default: false,
        type: Boolean
    },
    quickCreateQueryURL: {
        default: "",
        type: String
    },
    variant: {
        default: "elevated",
        type: String
    },
    wishlistOwner: {
        default: false,
        type: Boolean
    }
});

let quickCreateURL = ref("");
let quickCreateError = ref({
    text: "",
    title: ""
});

let quickcreateDialogOpen = ref(false);
let listSaveLoading = ref(false);

const copyListURL = async () => {
    const listURL = `${window.location.origin}/${props.list.shortUrl ? props.list.shortUrl : "list/" + props.list.$id}`;
    if (navigator.share) {
        try {
            await navigator.share({
                url: listURL
            });

            return;
        } catch (error) {
            if (error?.name === "AbortError") return;
        }
    }

    navigator.clipboard.writeText(listURL);
    shareButtonSnackbarOpen.value = true;
};

const saveList = async () => {
    listSaveLoading.value = true;
    if (!auth.user) {
        listSaveLoading.value = false;
        dialogs.create({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "Log In",
                    to: "/dash/login?redirect=" + encodeURIComponent(window.location.pathname + window.location.search)
                },
                {
                    action: "close",
                    color: "default",
                    text: "Cancel"
                }
            ],
            fullscreen: true,
            text: "Log In to save this list for later, as well as to create your own lists!",
            title: "Log In Required",
            variant: "info"
        });
        return;
    }
    if (auth.newUserPrefs.savedLists && auth.newUserPrefs.savedLists.includes(props.list.$id)) {
        auth.newUserPrefs.savedLists = auth.newUserPrefs.savedLists.filter(
            (listId) => listId !== props.list.$id
        );
        try {
            const accountResp = await account.updatePrefs(auth.newUserPrefs);
            auth.userPrefs = accountResp.prefs;
            listSaveLoading.value = false;
        } catch (error) {
            listSaveLoading.value = false;
            dialogs.create({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text:
                    "An error occurred while trying to unsave this list. Please try again later. " +
                    error.message,
                title: "Error",
                variant: "error"
            });
        }
    } else {
        auth.newUserPrefs.savedLists = [...auth.newUserPrefs.savedLists, props.list.$id];
        try {
            const accountResp = await account.updatePrefs(auth.newUserPrefs);
            auth.userPrefs = accountResp.prefs;
            listSaveLoading.value = false;
        } catch (error) {
            listSaveLoading.value = false;
            dialogs.create({
                actions: [
                    {
                        action: "close",
                        color: "primary",
                        text: "OK"
                    }
                ],
                text:
                    "An error occurred while trying to save this list. Please try again later. " +
                    error.message,
                title: "Error",
                variant: "error"
            });
        }
    }
};

const quickCreate = async () => {
    try {
        const clipboardContents = await navigator.clipboard.readText();

        const validURLs = clipboardContents.match(validation.urlRegexGlobal);

        if (!validURLs || validURLs.length === 0) {
            quickCreateError.value = {
                text: "The clipboard does not contain any valid URLs.",
                title: "Invalid URL"
            };
            quickcreateDialogOpen.value = true;
        } else {
            quickCreateURL.value = validURLs[0];
        }
    } catch (error) {
        quickCreateError.value = {
            text: "An error occurred while reading the clipboard: " + error.message,
            title: "Error"
        };
        quickcreateDialogOpen.value = true;
        console.error("Clipboard read error:", error);
    }
};

const resetQuickCreateURL = () => {
    quickCreateURL.value = "";
    const { quickcreateurl, ...remainingQueries } = Object.fromEntries(
        new URLSearchParams(window.location.search)
    );
    if (quickcreateurl) {
        const newQueryString = new URLSearchParams(remainingQueries).toString();
        const newURL =
            window.location.pathname + (newQueryString ? `?${newQueryString}` : "");
        window.history.replaceState({}, document.title, newURL);
    }
};

if (props.quickCreateQueryURL) {
    quickCreateURL.value = props.quickCreateQueryURL;
}
</script>
