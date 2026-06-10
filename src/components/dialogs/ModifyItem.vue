<template>
    <v-dialog
        v-model="dialogOpen"
        :max-width="$vuetify.display.mobile ? '100%' : '90%'"
        :fullscreen="$vuetify.display.mobile ? true : false"
    >
        <template v-slot:activator="{ props: activatorProps }">
            <template v-if="item">
                <v-btn
                    v-bind="activatorProps"
                    :icon="mdiPencil"
                    base-color="primary"
                    :variant="variant"
                />
            </template>
            <template v-else>
                <v-fab
                    v-bind="activatorProps"
                    size="large"
                    rounded="circle"
                    :icon="mdiPlus"
                />
            </template>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card
                :title="
                    item
                        ? 'Edit' + (wishlistOwner ? '' : ' Purchased') + ' Item'
                        : 'Create' + (wishlistOwner ? '' : ' Purchased') + ' Item'
                "
            >
                <v-card-text>
                    <v-alert
                        v-if="!wishlistOwner && !item"
                        type="info"
                        elevation="2"
                        :icon="mdiAlert"
                        class="m-4 mb-8"
                        color="primary"
                    >
                        You are adding an item to someone else's wishlist. This item will be marked
                        as purchased on their list, but it will not be shown to the wishlist owner.
                        This should help prevent duplicate items.
                    </v-alert>
                    <ItemFields
                        v-model:item="modifiedItem"
                        :currency="currency"
                        :errors="errors"
                        @file-state="setFileState"
                        :uploading-file="uploadingFile"
                        :wishlistOwner="wishlistOwner"
                        :previousValues="previousValues"
                    />
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
                        :prepend-icon="mdiRobot"
                        variant="tonal"
                        :disabled="!(modifiedItem.url && (limits.autofill || autofillUsage.remainingAllowance.value !== 0))"
                        @click="autofill"
                        v-if="limits.autofill || autofillUsage.totalAllowance.value > 0"
                    >
                        Autofill
                        <template v-if="!limits.autofill">
                            ({{ autofillUsage.remainingAllowance }}/{{ autofillUsage.totalAllowance }})
                        </template>
                    </v-btn>
                    <v-btn
                        text="Cancel"
                        @click="isActive.value = false"
                    />
                    <v-btn
                        color="primary"
                        text="Save"
                        @click="editItem"
                        variant="elevated"
                        :loading="loading"
                        v-if="item"
                    />
                    <v-btn
                        color="primary"
                        text="Create"
                        @click="createItem"
                        variant="elevated"
                        :loading="loading"
                        v-else
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { autofillUsage as autofillUsageStore, limits as limitsStore } from "@/stores/billing";
import { mdiAlert, mdiPencil, mdiPlus, mdiRobot } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog, VFab } from "vuetify/components";
import { create as createDialog } from "@/stores/dialogs";
import { ENABLE_BILLING } from "astro:env/client";
import { getJwt } from "@/stores/auth";
import { handleFetch } from "@/utils/handleFetch";
import { ID } from "appwrite";
import ImageSelector from "@/components/dialogs/ImageSelector.vue";
import ItemFields from "@/components/dialogs/fields/ItemFields.vue";
import { markRaw } from "vue";
import mime from "mime-types";
import ProcessingAutofill from "@/components/dialogs/autofill/ProcessingAutofill.vue";
import { user as userStore } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

export default {
    title: "ListDialog",
    components: {
        ItemFields,
        VBtn,
        VAlert,
        VCard,
        VCardActions,
        VCardText,
        VDialog,
        VFab
    },
    props: {
        currency: {
            type: String,
            required: true
        },
        item: {
            type: Object
        },
        list: {
            type: Object,
            default: () => ({})
        },
        itemLimitReached: {
            type: Boolean,
            default: false
        },
        quickCreateURL: {
            type: String,
            default: ""
        },
        variant: {
            type: String,
            default: "elevated"
        },
        wishlistOwner: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            autofillUsage: useStore(autofillUsageStore),
            alert: false,
            createDialog,
            dialogOpen: false,
            errors: {},
            fileState: false,
            itemID: null,
            listId: null,
            loading: false,
            mdiAlert,
            mdiPencil,
            mdiPlus,
            mdiRobot,
            modifiedItem: {
                description: "",
                displayPrice: true,
                image: null,
                imageFile: null,
                imageID: null,
                price: "",
                priority: "none",
                title: "",
                url: ""
            },
            limits: useStore(limitsStore),
            previousValues: {},
            uploadingFile: false,
            user: useStore(userStore)
        };
    },
    watch: {
        async dialogOpen(open) {
            this.errors = {};
            if (open === true) {
                this.fileState = false;
                if (this.itemLimitReached) {
                    this.dialogOpen = false;
                    this.$emit("itemLimitReached");
                }
                this.listId = this.list.$id;

                if (this.item) {
                    this.itemID = this.item.$id;
                    this.modifiedItem = {
                        description: this.item.description,
                        displayPrice: this.item.displayPrice,
                        image: this.item.image,
                        imageFile: this.getExistingImageFilePlaceholder(this.item.imageID),
                        imageID: this.item.imageID,
                        price: this.item.price,
                        priority: this.item.priority,
                        title: this.item.title,
                        url: this.item.url
                    };

                    this.previousValues = { ...this.modifiedItem };

                    if (this.item.imageID) {
                        this.loadExistingImageFile(this.item.imageID);
                    }
                } else {
                    this.itemID = ID.unique();
                }
            } else {
                this.fileState = false;
                this.previousValues = {};
                this.modifiedItem = {
                    description: "",
                    displayPrice: true,
                    image: null,
                    imageFile: null,
                    imageID: null,
                    price: "",
                    priority: "none",
                    title: "",
                    url: ""
                };
            }
        },
        async quickCreateURL(newURL) {
            if (newURL) {
                this.dialogOpen = false;
                this.modifiedItem.url = newURL;
                this.itemID = ID.unique();
                this.$emit("unsetQuickCreateURL", "");

                await this.autofill();

                this.dialogOpen = true;
            }
        }
    },
    methods: {
        async autofill() {
            if (!this.limits.autofill) {
                if (this.autofillUsage.remainingAllowance > 0) {
                    const useAutofill = await this.createDialog({
                        async: true,
                        title: "Use Auto-fill?",
                        text: `You have ${this.autofillUsage.remainingAllowance}/${this.autofillUsage.totalAllowance} auto-fill uses remaining.\nThey will only be consumed if the auto-fill process successfully retrieves data.\n\nDo you want to proceed?`,
                        actions: [
                            {
                                action: "close",
                                text: "No"
                            },
                            {
                                action: "close",
                                color: "primary",
                                text: "Yes"
                            }
                        ]
                    });

                    if (useAutofill.action !== "Yes") {
                        return;
                    }
                } else {
                    this.createDialog(
                        ENABLE_BILLING
                            ? {
                                title: "Auto-fill Unavailable",
                                text: "You have used all of your available auto-fill attempts.\nPlease enter the details manually or upgrade to the Pro plan for unlimited auto-fill.",
                                actions: [
                                    {
                                        action: "close",
                                        color: "primary",
                                        text: "Close"
                                    },
                                    {
                                        to: "/dash/settings/billing",
                                        color: "secondary",
                                        closeAfterAction: true,
                                        text: "Upgrade to Pro"
                                    }
                                ]
                            }
                            : {
                                title: "Auto-fill Unavailable",
                                text: "You have used all of your available auto-fill attempts.\nPlease enter the details manually.",
                                actions: [
                                    {
                                        action: "close",
                                        color: "primary",
                                        text: "Close"
                                    }
                                ]
                            }
                    );

                    return;
                }
            }

            this.previousValues = { ...this.modifiedItem };

            const resp = await this.createDialog({
                async: true,
                component: markRaw(ProcessingAutofill),
                emits: [
                    "complete", "error"
                ],
                fullscreen: false,
                maxWidth: "90%",
                props: {
                    currency: this.currency,
                    itemID: this.itemID,
                    url: this.modifiedItem.url
                }
            });

            if (resp.action === "closed") {
                return;
            }

            if (resp.action === "error") {
                await this.createDialog({
                    actions: [
                        {
                            action: "close",
                            color: "primary",
                            text: "OK"
                        }
                    ],
                    text: resp.data || "An unknown error occurred during auto-fill.",
                    title: "Error",
                    variant: "error"
                });
                return;
            }

            const autofillData = JSON.parse(resp.data);
            if (!autofillData) {
                await this.createDialog({
                    actions: [
                        {
                            action: "close",
                            color: "primary",
                            text: "OK"
                        }
                    ],
                    text: "No data was returned from the auto-fill process.",
                    title: "Error",
                    variant: "error"
                });
                return;
            }

            if (autofillData.images.length > 1) {
                const images = autofillData.images.map((image) => {
                    image.best = image.src === autofillData.bestImage.src;
                    return image;
                }).sort((a, b) => {
                    if (a.best && !b.best) {
                        return -1;
                    }
                    if (!a.best && b.best) {
                        return 1;
                    }
                    return 0;
                });
                const imageSelectorResp = await this.createDialog({
                    async: true,
                    component: markRaw(ImageSelector),
                    emits: [
                        "select-image"
                    ],
                    fullscreen: false,
                    props: {
                        images: images
                    }
                });
                if (imageSelectorResp.action === "select-image") {
                    this.modifiedItem.image = images[imageSelectorResp.data].src;
                    this.modifiedItem.imageFile = null;
                    this.modifiedItem.imageID = null;
                } else {
                    // User cancelled image selection
                    this.modifiedItem.image = images[0].src;
                    this.modifiedItem.imageFile = null;
                    this.modifiedItem.imageID = null;
                }
            } else if (autofillData.images.length === 1) {
                this.modifiedItem.image = autofillData.images[0].src;
                this.modifiedItem.imageFile = null;
                this.modifiedItem.imageID = null;
            }

            this.modifiedItem.title = autofillData.title || this.modifiedItem.title;
            this.modifiedItem.price = autofillData.price
                ? autofillData.price.price
                : this.modifiedItem.price;

            this.modifiedItem.url = autofillData.url || this.modifiedItem.url;
        },
        async setFileState(value) {
            this.fileState = value;
            if (value === "removed") {
                this.modifiedItem.imageFile = null;
                this.modifiedItem.imageID = null;
                this.modifiedItem.image = null;
            }
        },
        getExistingImageFilePlaceholder(imageID) {
            if (!imageID) {
                return null;
            }

            return {
                existing: true,
                loading: true,
                name: "Current image",
                size: 0,
                type: "image/*"
            };
        },
        async loadExistingImageFile(imageID) {
            try {
                const jwt = await getJwt();
                if (!jwt) {
                    return;
                }

                const params = new URLSearchParams({
                    fileId: imageID,
                    itemId: this.itemID
                });

                const [data, error] = await handleFetch(`/api/content/item/image?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                });

                if (error || !data?.file) {
                    if (error) {
                        console.error(error);
                    }
                    return;
                }

                if (this.modifiedItem.imageID !== imageID || this.fileState === "removed") {
                    return;
                }

                const { file } = data;
                this.modifiedItem.imageFile = {
                    existing: true,
                    lastModified: file.updatedAt ? new Date(file.updatedAt).getTime() : undefined,
                    name: file.name || "Current image",
                    size: file.size || 0,
                    type: file.mimeType || "image/*"
                };
            } catch (error) {
                console.error("Failed to load existing image metadata:", error);
            }
        },
        async uploadImageFile({ jwt }) {
            const formData = new FormData();
            formData.append("file", this.modifiedItem.imageFile);
            formData.append("listId", this.listId);

            const response = await fetch("/api/content/item/image", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`
                },
                body: formData
            });

            let data;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                throw new Error(data?.message || "Failed to upload image");
            }

            return data.file;
        },
        async createItem() {
            let result;
            this.alert = false;
            this.loading = true;

            if (this.modifiedItem.title === "") {
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
                    text: "You must be logged in to create an item.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            try {
                if (this.modifiedItem.image) {
                    await this.downloadRemoteImage(this.modifiedItem.image);
                }

                if (this.modifiedItem.imageFile && !this.modifiedItem.imageID) {
                    this.uploadingFile = true;
                    let fileUpload;

                    try {
                        fileUpload = await this.uploadImageFile({ jwt });
                    } finally {
                        this.uploadingFile = false;
                    }

                    this.modifiedItem.imageID = fileUpload.$id;
                    this.modifiedItem.image = "";
                }

                const [createRespData, createError] = await handleFetch("/api/content/item", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${jwt}`
                    },
                    body: JSON.stringify({
                        itemData: {
                            communityList: this.wishlistOwner ? null : this.listId,
                            contributorId: this.wishlistOwner ? null : this.user.$id,
                            contributorName: this.wishlistOwner ? null : this.user.name,
                            description: this.modifiedItem.description || null,
                            displayPrice: this.modifiedItem.displayPrice,
                            image: this.modifiedItem.image || null,
                            imageID: this.modifiedItem.imageID || null,
                            list: this.listId,
                            price: parseFloat(this.modifiedItem.price) || 0,
                            priority: this.modifiedItem.priority,
                            title: this.modifiedItem.title,
                            url: this.modifiedItem.url || null
                        }
                    })
                });

                if (createError) {
                    this.alert = {
                        text: createError.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                result = createRespData.item;
            } catch (e) {
                this.uploadingFile = false;
                this.alert = {
                    text: e.message || "An unknown error occurred.",
                    title: "Error"
                };
                console.error(e);
                this.loading = false;
                return;
            }

            this.$emit("newItem", {
                item: result
            });

            this.modifiedItem = {
                description: "",
                displayPrice: true,
                image: "",
                imageID: null,
                price: 0,
                priority: "none",
                title: "",
                url: ""
            };

            this.dialogOpen = false;
            this.loading = false;
        },
        async editItem() {
            let result;
            this.alert = false;
            this.loading = true;

            const jwt = await getJwt();
            if (!jwt) {
                this.alert = {
                    text: "You must be logged in to edit an item.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            try {
                // Upload hotlinked image if present (manually added)
                if (this.modifiedItem.image) {
                    await this.downloadRemoteImage(this.modifiedItem.image);
                }

                if (this.fileState === "removed") {
                    this.modifiedItem.imageID = null;
                    this.modifiedItem.image = null;
                }

                if (["added", "replaced"].includes(this.fileState)) {
                    this.uploadingFile = true;
                    let fileUpload;

                    try {
                        fileUpload = await this.uploadImageFile({ jwt });
                    } finally {
                        this.uploadingFile = false;
                    }

                    this.modifiedItem.imageID = fileUpload.$id;
                    this.modifiedItem.image = "";
                }

                const [updateRespData, updateError] = await handleFetch("/api/content/item", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${jwt}`
                    },
                    body: JSON.stringify({
                        itemId: this.item.$id,
                        updateData: {
                            description: this.modifiedItem.description || null,
                            displayPrice: this.modifiedItem.displayPrice,
                            image: this.modifiedItem.image || null,
                            imageID: this.modifiedItem.imageID || null,
                            price: parseFloat(this.modifiedItem.price) || 0,
                            priority: this.modifiedItem.priority,
                            title: this.modifiedItem.title,
                            url: this.modifiedItem.url || null
                        }
                    })
                });

                if (updateError) {
                    this.alert = {
                        text: updateError.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                result = updateRespData.item;
            } catch (e) {
                this.uploadingFile = false;
                this.alert = {
                    text: e.message || "An unknown error occurred.",
                    title: "Error"
                };
                this.loading = false;
                return;
            }

            this.$emit("editItem", {
                item: result
            });

            this.dialogOpen = false;
            this.loading = false;
        },
        async downloadRemoteImage(imageURL) {
            try {
                const imageResponse = await fetch(imageURL);

                let imageBlob = await imageResponse.blob();

                let fileExt = mime.extension(imageBlob.type) || "png";

                if (fileExt === "webp") {
                    // Leave webp as is, due to https://github.com/appwrite/appwrite/issues/10699
                    return;
                }

                const imageFile = new File(
                    [imageBlob], `image.${fileExt}`,
                    { type: imageBlob.type }
                );
                this.fileState = this.modifiedItem.imageID ? "replaced" : "added";
                this.modifiedItem.imageFile = imageFile;
                this.modifiedItem.image = "";
            } catch (error) {
                // Will just be hotlinked instead
                console.error("Failed to download remote image:", error);
            }
        }
    },
    async mounted() {
        if (this.quickCreateURL) {
            this.dialogOpen = false;
            this.modifiedItem.url = this.quickCreateURL;
            this.itemID = ID.unique();
            this.$emit("unsetQuickCreateURL", "");
            await this.autofill();

            this.dialogOpen = true;
        }
    }
};
</script>
