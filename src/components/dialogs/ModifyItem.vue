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
                    <v-tooltip
                        :open-on-hover="false"
                        :open-on-click="!(modifiedItem.url && limits.autofill) ? true : false"
                        location="top"
                    >
                        <template v-slot:activator="{ props }">
                            <span v-bind="props">
                                <v-btn
                                    text="Auto-fill"
                                    :prepend-icon="mdiRobot"
                                    variant="tonal"
                                    :disabled="!(modifiedItem.url && limits.autofill)"
                                    @click="autofill"
                                />
                            </span>
                        </template>
                        <span>
                            <template v-if="limits.autofill && !modifiedItem.url">
                                Please enter a URL to use the auto-fill feature.
                            </template>
                            <template v-else-if="!limits.autofill">
                                Auto-fill feature is not available on the free plan. Please upgrade to use this feature.
                            </template>
                        </span>
                    </v-tooltip>
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
import { AppwriteException, ID, Permission, Role } from "appwrite";
import { mdiAlert, mdiPencil, mdiPlus, mdiRobot } from "@mdi/js";
import { VAlert, VBtn, VCard, VCardActions, VCardText, VDialog, VFab, VTooltip } from "vuetify/components";
import { APPWRITE_IMAGE_BUCKET } from "astro:env/client";
import { create as createDialog } from "@/stores/dialogs";
import { getJwt } from "@/stores/auth";
import ImageSelector from "@/components/dialogs/ImageSelector.vue";
import ItemFields from "@/components/dialogs/fields/ItemFields.vue";
import { limits as limitsStore } from "@/stores/billing";
import { markRaw } from "vue";
import mime from "mime-types";
import ProcessingAutofill from "@/components/dialogs/autofill/ProcessingAutofill.vue";
import { storage } from "@/appwrite";
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
        VFab,
        VTooltip
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
                        imageID: this.item.imageID,
                        price: this.item.price,
                        priority: this.item.priority,
                        title: this.item.title,
                        url: this.item.url
                    };

                    this.previousValues = { ...this.modifiedItem };

                    if (this.item.imageID) {
                        const file = await storage.getFile(
                            APPWRITE_IMAGE_BUCKET,
                            this.item.imageID
                        );

                        this.modifiedItem.imageFile = new File(
                            ["a".repeat(file.sizeOriginal)],
                            file.name
                        );
                    }
                } else {
                    this.itemID = ID.unique();
                }
            } else {
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
                this.alert = {
                    text: resp.data || "An unknown error occurred during auto-fill.",
                    title: "Error"
                };
                return;
            }

            const autofillData = JSON.parse(resp.data);
            if (!autofillData) {
                this.alert = {
                    text: "No data was returned from the auto-fill process.",
                    title: "Error"
                };
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
                try {
                    await storage.deleteFile(
                        APPWRITE_IMAGE_BUCKET,
                        this.modifiedItem.imageID
                    );
                } catch (e) {
                    console.error("Failed to delete file:", e);
                }
                this.modifiedItem.imageFile = null;
                this.modifiedItem.imageID = null;
            }
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
                let permissions = [
                    Permission.delete(Role.user(this.user.$id)),
                    Permission.update(Role.user(this.user.$id))
                ];

                if (this.wishlistOwner && this.list.private) {
                    permissions.push(
                        Permission.read(Role.user(this.user.$id))
                    );
                } else {
                    permissions.push(
                        Permission.read(Role.any())
                    );
                }

                if (this.modifiedItem.image) {
                    await this.downloadRemoteImage(this.modifiedItem.image);
                }
                if (this.modifiedItem.imageFile && !this.modifiedItem.imageID) {
                    this.uploadingFile = true;
                    const fileUpload = await storage.createFile(
                        APPWRITE_IMAGE_BUCKET,
                        ID.unique(),
                        this.modifiedItem.imageFile,
                        permissions
                    );

                    this.uploadingFile = false;
                    this.modifiedItem.imageID = fileUpload.$id;
                    this.modifiedItem.image = "";
                }

                const createResp = await fetch("/api/content/item", {
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

                const createRespData = await createResp.json();

                if (!createResp.ok) {
                    this.alert = {
                        text: createRespData.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                result = createRespData.item;
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

            let permissions = [
                Permission.delete(Role.user(this.user.$id)),
                Permission.update(Role.user(this.user.$id))
            ];

            if (this.wishlistOwner && this.list.private) {
                permissions.push(
                    Permission.read(Role.user(this.user.$id))
                );
            } else {
                permissions.push(
                    Permission.read(Role.any())
                );
            }

            try {
                // Upload hotlinked image if present (manually added)
                if (this.modifiedItem.image) {
                    await this.downloadRemoteImage(this.modifiedItem.image);
                }

                if (["removed", "replaced"].includes(this.fileState)) {
                    try {
                        if (this.modifiedItem.imageID) {
                            await storage.deleteFile(
                                APPWRITE_IMAGE_BUCKET,
                                this.modifiedItem.imageID
                            );

                            this.modifiedItem.imageID = null;
                        }

                    } catch (e) {
                        console.error("Failed to delete file:", e);
                    }
                }

                if (["added", "replaced"].includes(this.fileState)) {
                    this.uploadingFile = true;
                    const fileUpload = await storage.createFile(
                        APPWRITE_IMAGE_BUCKET,
                        ID.unique(),
                        this.modifiedItem.imageFile,
                        permissions
                    );

                    this.uploadingFile = false;

                    this.modifiedItem.imageID = fileUpload.$id;
                    this.modifiedItem.image = "";
                }

                const updateResp = await fetch("/api/content/item", {
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

                const updateRespData = await updateResp.json();

                if (!updateResp.ok) {
                    this.alert = {
                        text: updateRespData.message || "An unknown error occurred.",
                        title: "Error"
                    };
                    this.loading = false;
                    return;
                }

                result = updateRespData.item;
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
