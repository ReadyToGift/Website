<template>
    <v-card
        class="item"
        :data-fulfilled="
            !!item.fulfillment && (!wishlistOwner || (wishlistOwner && spoilSurprises)) || (!!item.communityList && !(auth.isLoggedIn && item.contributorId === auth.user.$id))
        "
        variant="tonal"
        :data-item-id="item.$id"
    >
        <div class="item-header">
            <h2>{{ item.title }}</h2>
            <v-btn-group
                base-color="primary"
                divided
                rounded="pill"
            >
                <FulfillItem
                    v-if="!item.communityList &&!wishlistOwner || (wishlistOwner && spoilSurprises && !item.communityList)"
                    :item="item"
                    @fulfillItem="$emit('fulfillItem', $event)"
                    @unfulfillItem="$emit('unfulfillItem', item.$id)"
                />
                <template v-if="item.url">
                    <v-btn
                        :append-icon="mdiOpenInNew"
                        :href="item.url"
                        target="_blank"
                        v-if="!$vuetify.display.mobile || !wishlistOwner"
                        variant="outlined"
                        size="small"
                    >
                        Open Website
                    </v-btn>
                    <v-btn
                        :icon="mdiOpenInNew"
                        :href="item.url"
                        target="_blank"
                        v-else
                        variant="outlined"
                        size="small"
                    />
                </template>
                <ModifyItem
                    variant="outlined"
                    :item="item"
                    :currency="currency"
                    @editItem="$emit('editItem', $event)"
                    :wishlistOwner="wishlistOwner"
                    v-if="(wishlistOwner && !item.communityList) || (auth.isLoggedIn && item.contributorId === auth.user.$id)"
                />
                <MoveItem
                    variant="outlined"
                    :item="item"
                    :list="list"
                    v-if="wishlistOwner && !item.communityList"
                    @loadList="$emit('loadList', $event)"
                    @removeItem="$emit('removeItem', $event)"
                />
                <DeleteItem
                    variant="outlined"
                    :item="item"
                    @removeItem="$emit('removeItem', $event)"
                    v-if="(wishlistOwner && !item.communityList) || (auth.isLoggedIn && item.contributorId === auth.user.$id)"
                />
            </v-btn-group>
        </div>
        <div class="item-content">
            <vue-markdown
                v-if="item.description"
                :source="item.description"
                class="item-description"
            />
            <div
                class="item-image"
                v-if="imageURL"
            >
                <v-img
                    :src="imageURL"
                    alt=""
                    height="200"
                    width="auto"
                    max-width="300"
                    position="center right"
                    v-if="!$vuetify.display.mobile"
                />
                <img
                    :src="imageURL"
                    alt=""
                    v-else
                />
            </div>
        </div>
        <template
            v-slot:actions
            v-if="item.fulfilledBy || item.price || item.priority !== 'none' || item.url || item.communityList"
        >
            <div class="item-footer">
                <div class="chips">
                    <v-chip
                        :prepend-icon="mdiGift"
                        v-if="item.fulfilledBy"
                        color="primary"
                        variant="elevated"
                        rounded
                    >
                        <span> Fulfilled by {{ item.fulfilledBy }} </span>
                    </v-chip>
                    <v-chip
                        v-if="item.price && item.displayPrice"
                        color="primary"
                        variant="elevated"
                        rounded
                    >
                        <span>{{ currencyStore.formatter(this.currency).format(item.price) }}</span>
                    </v-chip>
                    <v-chip
                        v-if="item.priority !== 'none' && item.priority"
                        :prepend-icon="convertPriority(item.priority).icon"
                        color="primary"
                        variant="elevated"
                        rounded
                    >
                        {{ convertPriority(item.priority).text }}
                    </v-chip>
                    <v-chip
                        :prepend-icon="mdiWeb"
                        v-if="item.url && validation.urlRegex.test(item.url)"
                        :href="item.url"
                        target="_blank"
                        rounded
                    >
                        {{ getWebsiteHostname(item.url) }}
                    </v-chip>
                </div>
                <v-chip
                    :prepend-avatar="userAvatar(item.contributorName)"
                    variant="tonal"
                    color="primary"
                    rounded
                    v-if="item.communityList"
                >
                    <template v-if="auth.isLoggedIn && item.contributorId === auth.user.$id">
                        You contributed this item
                    </template>
                    <template v-else>
                        Gifted by {{ item.contributorName }}
                    </template>
                </v-chip>
            </div>
        </template>
    </v-card>
</template>

<script>
import { avatars, storage } from "@/appwrite";
import { mdiGift, mdiOpenInNew, mdiWeb } from "@mdi/js";
import { APPWRITE_IMAGE_BUCKET } from "astro:env/client";
import { convertPriority } from "@/utils";
import DeleteItem from "@/components/dialogs/DeleteItem.vue";
import FulfillItem from "@/components/dialogs/FulfillItem.vue";
import { ImageFormat } from "appwrite";
import ModifyItem from "./dialogs/ModifyItem.vue";
import MoveItem from "@/components/dialogs/MoveItem.vue";
import { useAuthStore } from "@/stores/auth";
import { useCurrencyStore } from "@/stores/currency";
import validation from "@/utils/validation";
import VueMarkdown from "vue-markdown-render";

export default {
    props: {
        currency: {
            type: String,
            required: true
        },
        item: {
            type: Object,
            required: true
        },
        list: {
            type: Object,
            required: true
        },
        wishlistOwner: {
            type: Boolean,
            default: false
        }
    },
    components: {
        DeleteItem,
        FulfillItem,
        ModifyItem,
        MoveItem,
        VueMarkdown
    },
    data() {
        return {
            auth: useAuthStore(),
            convertPriority,
            currencyStore: useCurrencyStore(),
            mdiGift,
            mdiOpenInNew,
            mdiWeb,
            validation
        };
    },
    computed: {
        imageURL() {
            if (this.item.imageID) {
                try {
                    const imageURL = storage.getFilePreview(
                        APPWRITE_IMAGE_BUCKET,
                        this.item.imageID,
                        undefined, // width (optional)
                        400, // height (optional)
                        undefined, // gravity (optional)
                        undefined, // quality (optional)
                        undefined, // borderWidth (optional)
                        undefined, // borderColor (optional)
                        undefined, // borderRadius (optional)
                        undefined, // opacity (optional)
                        undefined, // rotation (optional)
                        undefined, // background (optional)
                        ImageFormat.Png // output (optional)
                    );
                    return imageURL.toString();
                } catch (error) {
                    console.error(error);
                    return null;
                }
            } else if (this.item.image) {
                return this.item.image;
            } else {
                return null;
            }
        },
        spoilSurprises() {
            return this.auth.userPrefs.spoilSurprises;
        }
    },
    methods: {
        getWebsiteHostname(url) {
            const toTitleCase = (str) => {
                return str.replace(
                    /\w\S*/g,
                    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
                );
            };

            const publicSuffixes = [
                "co.uk", "org.uk", "gov.uk", "ac.uk", "net.uk", "sch.uk", // United Kingdom
                "com.au", "net.au", "org.au", "edu.au", "gov.au", // Australia
                "co.nz", "net.nz", "org.nz", "govt.nz", // New Zealand
                "co.in", "net.in", "org.in", "gov.in", "ac.in", // India
                "com.sg", "net.sg", "org.sg", "gov.sg", "edu.sg", // Singapore
                "com.my", "net.my", "org.my", "gov.my", "edu.my", // Malaysia
                "co.za", "net.za", "org.za", "gov.za", // South Africa
                "co.jp", "ac.jp", "ne.jp", "or.jp", // Japan
                "com.br", "net.br", "org.br", "gov.br", "edu.br", // Brazil
                "com.mx", "org.mx", "gob.mx", // Mexico
                "co.kr", "or.kr", "ac.kr", "go.kr", // South Korea
                "com.tr", "net.tr", "org.tr", "edu.tr", "gov.tr" // Turkey
            ];


            const { hostname } = new URL(url);
            const parts = hostname.split(".");

            // Handle domains with public suffixes
            for (let i = 0; i < publicSuffixes.length; i++) {
                if (hostname.endsWith(publicSuffixes[i])) {
                    return toTitleCase(parts[parts.length - 3]);  // Get the part before the suffix
                }
            }

            const website = parts.length > 2 ? parts[parts.length - 2] : parts[0];
            return toTitleCase(website);
        },
        userAvatar(name) {
            try {
                return avatars.getInitials(name, 32, 32);
            } catch (error) {
                console.error(error);
                return null;
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.item {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .item-header {
        display: grid;
        grid-template-columns: 1fr max-content;
        gap: 1rem;
        justify-content: space-between;
        h2 {
            color: rgb(var(--v-theme-primary));
            font-size: 1.8rem;
            margin: 0;
            align-self: center;
        }

        .v-btn-group {
            justify-self: end;
            align-self: center;
        }
    }


    .item-content {
        display: grid;
        grid-template-columns: 1fr max-content;
        gap: 1rem;
        justify-content: space-between;
        .item-image {
            .v-img {
                margin-left: auto;
            }
            > img {
                max-width: 100%;
                max-height: 100%;
                margin-left: auto;
            }
        }
    }


    .item-footer {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;

        .chips {
            margin-top: auto;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
    }

    &[data-fulfilled="true"] {
        opacity: 0.5;
    }

    @media screen and (max-width: 768px) {
        .item-header {
            grid-template-columns: 1fr;
            gap: 0.5rem;
            .v-btn-group {
                justify-self: flex-start;
            }
        }
        .item-content {
            display: flex;
            flex-direction: column;
            margin-top: 1rem;

            .item-image {
                img {
                    max-height: 100%;
                    max-width: 100%;
                }
            }
        }
    }
}
</style>
