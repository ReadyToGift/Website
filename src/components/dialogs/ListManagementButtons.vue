<template>
    <v-btn-group
        base-color="primary"
        divided
        rounded="pill"
        density="comfortable"
        size="small"
        :class="props.class"
    >
        <EditList
            :list="list"
            @updateList="$emit('updateList', $event)"
            @dialogClosed="menuOpen = false"
            v-if="!$vuetify.display.mobile && wishlistOwner"
        />

        <v-dialog
            :max-width="$vuetify.display.mobile ? '100%' : '500px'"
            v-model="quickcreateDialogOpen"
            v-if="wishlistOwner"
        >
            <template v-slot:activator>
                <v-btn
                    :prepend-icon="mdiClipboard"
                    variant="outlined"
                    @click="quickCreate"
                >
                    Quick Create
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
            :prepend-icon="listSaved ? mdiStarOff : mdiStar"
            :variant="listSaved ? 'tonal' : 'outlined'"
            v-if="!wishlistOwner"
            @click="saveList"
            :loading="listSaveLoading"
        >
            {{ listSaved ? "Unsave" : "Save" }}
        </v-btn>

        <v-btn
            variant="outlined"
            :prepend-icon="mdiShare"
            @click="copyListURL"
        >
            Share
        </v-btn>

        <DeleteList
            :list="list"
            @dialogClosed="menuOpen = false"
            v-if="!$vuetify.display.mobile && wishlistOwner"
        />

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
import { mdiClipboard, mdiShare, mdiStar, mdiStarOff } from "@mdi/js";
import { account } from "@/appwrite";
import DeleteList from "./DeleteList.vue";
import EditList from "./EditList.vue";
import { ref } from "vue";
// import { useAuthStore } from "@/stores/auth";
import { create as createDialog } from "@/stores/dialogs";
import validation from "@/utils/validation";


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
        createDialog({
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "Log In",
                    href: "/dash/login?redirect=" + encodeURIComponent(window.location.pathname + window.location.search)
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
            createDialog({
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
            createDialog({
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

if (props.quickCreateQueryURL) {
    quickCreateURL.value = props.quickCreateQueryURL;
}
</script>
