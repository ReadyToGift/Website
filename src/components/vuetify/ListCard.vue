<template>
    <v-card
        :to=" props.header || props.type === 'selectable' ? undefined : `/list/${props.list.$id}${quickCreateURL && ownList ? `?quickCreateURL=${props.quickCreateURL}` : ''}`"
        :title="props.list.title"
        variant="tonal"
        :color="props.selected ? 'primary' : 'default'"
        :class="['list-card', 'mb-4', props.type]"
    >
        <template v-slot:title>
            <div class="title-container">
                <div class="title">
                    <component
                        :is="props.header ? 'h2' : 'h3'"
                        v-if="props.list.title"
                    >

                        <span
                            class="list-visibility"
                            v-if="ownList"
                        >
                            <v-icon
                                v-if="!props.list.private"
                                :icon="mdiEarth"
                                size="24"
                                class="me-2"
                                :title="'This list is public'"
                            />
                            <v-icon
                                v-else
                                :icon="mdiLock"
                                size="24"
                                class="me-2"
                                :title="'This list is private'"
                            />
                        </span>
                        {{ props.list.title }}
                    </component>
                </div>
                <div
                    class="title-actions"
                    v-if="props.header"
                >
                    <v-speed-dial
                        location="bottom center"
                        v-if="$vuetify.display.mobile && props.ownList && props.type !== 'selectable'"
                        @click.stop
                    >
                        <template v-slot:activator="{ props: activatorProps }">
                            <v-fab
                                v-bind="activatorProps"
                                size="small"
                                variant="tonal"
                                color="on-surface"
                                :icon="mdiDotsVertical"
                            />
                        </template>

                        <div key="edit">
                            <EditList
                                :list="props.list"
                                @updateList="(data) => emit('updateList', data)"
                            />
                        </div>

                        <div key="delete">
                            <DeleteList
                                :list="props.list"
                            />
                        </div>
                    </v-speed-dial>
                </div>
            </div>
        </template>
        <template
            v-slot:subtitle
        >
            <div class="chips-row mt-4">

                <div class="chips">
                    <v-chip
                        v-if="!props.ownList && props.type !== 'selectable'"
                        :prepend-avatar="userAvatar(list.authorName)"
                        variant="tonal"
                        color="primary"
                        rounded
                    >
                        {{ list.authorName }}
                    </v-chip>
                    <v-chip
                        :prepend-icon="mdiFileDocumentMultiple"
                        variant="tonal"
                        rounded
                        class="list-limit-chip"
                        v-if="list.itemCount !== null"
                    >
                        {{ list.itemCount }}{{ ownList && limits.itemsPerList > 0 ? "/" + limits.itemsPerList : '' }} items
                        <div
                            class="progress"
                            v-if="ENABLE_BILLING"
                        >
                            <v-progress-linear
                                :max="limits.itemsPerList"
                                :model-value="list.itemCount"
                                height="2"
                                :buffer-value="limits.itemsPerList"
                                color="primary"
                                v-if="ownList"
                            />
                        </div>
                    </v-chip>
                    <v-chip
                        :prepend-icon="mdiUpdate"
                        variant="tonal"
                        rounded
                    >
                        {{ new Date(list.$updatedAt).toLocaleString() }}
                    </v-chip>
                    <v-chip
                        :prepend-icon="mdiInvoiceList"
                        variant="tonal"
                        rounded
                        v-if="prefs.showTotalPrice && list.items && list.items.length > 0"
                    >
                        {{
                            currencyFormatter(props.list.currency).format(
                                list.items.reduce((sum, item) => sum + (item.price || 0), 0) +
                                    (
                                        !ownList || (ownList && spoilSurprises) ? communityItems.reduce((sum, item) => sum + (item.price || 0), 0) : 0
                                    )
                            )
                        }}
                    </v-chip>
                </div>
            </div>
        </template>

        <template v-slot:append>
            <ListManagementButtons
                :list="props.list"
                :currency="list.currency"
                :wishlistOwner="ownList"
                :listSaved="props.listSaved"
                :itemLimitReached="itemLimitReached"
                @itemLimitReached="emit('itemLimitReached')"
                @quickCreate="(data) => emit('quickCreate', data)"
                @newItem="(data) => emit('newItem', data)"
                @updateList="(data) => emit('updateList', data)"
                v-if="props.header && !$vuetify.display.mobile"
            />
        </template>

        <v-card-text v-if="props.header && (props.list.description || $vuetify.display.mobile || !user)">
            <VueMarkdown
                v-if="props.list.description"
                :source="props.list.description"
                class="description user-item-markdown mb-4"
            />
            <div class="mobile-list-buttons">
                <ListManagementButtons
                    :list="props.list"
                    :currency="list.currency"
                    :wishlistOwner="ownList"
                    :listSaved="props.listSaved"
                    :itemLimitReached="itemLimitReached"
                    @itemLimitReached="emit('itemLimitReached')"
                    @quickCreate="(data) => emit('quickCreate', data)"
                    @newItem="(data) => emit('newItem', data)"
                    @updateList="(data) => emit('updateList', data)"
                    v-if="props.header && $vuetify.display.mobile"
                />
            </div>
            <v-alert
                v-if="!user"
                type="info"
                elevation="2"
                :icon="mdiAlert"
                :class="['m-4', 'mb-8', $vuetify.display.mobile ? 'mt-4': '']"
                color="primary"
            >
                <a
                    style="color: inherit; font-weight: bold;"
                    to="/dash/login"
                >Log in</a> to add your own items, to avoid the list creator receiving duplicate gifts, and to manage your wish lists!
            </v-alert>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { mdiAlert, mdiDotsVertical, mdiEarth, mdiFileDocumentMultiple, mdiInvoiceList, mdiLock, mdiUpdate } from "@mdi/js";
import { VAlert, VCard, VCardText, VChip, VFab, VIcon, VProgressLinear, VSpeedDial } from "vuetify/components";
import { $prefs } from "@/stores/prefs";
import { avatars } from "@/appwrite";
import { formatter as currencyFormatter } from "@/stores/currency";
import DeleteList from "./dialogs/DeleteList.vue";
import EditList from "./dialogs/EditList.vue";
import { limits as limitsStore } from "@/stores/billing";
import ListManagementButtons from "@/components/vuetify/dialogs/ListManagementButtons.vue";
import { user as userStore } from "@/stores/auth";
import { useStore } from "@nanostores/vue";

import { ENABLE_BILLING } from "astro:env/client";

const prefs = useStore($prefs);
const user = useStore(userStore);
const limits = useStore(limitsStore);

import VueMarkdown from "vue-markdown-render";

const emit = defineEmits(["newItem", "updateList", "quickCreate"]);

const props = defineProps({
    buttonProps: {
        default: () => ({}),
        type: Object
    },
    communityItems: {
        default: () => ([]),
        type: Array
    },
    header: {
        default: false,
        type: Boolean
    },
    list: {
        required: true,
        type: Object
    },
    listSaved: {
        default: false,
        type: Boolean
    },
    itemLimitReached: {
        default: false,
        type: Boolean
    },
    ownList: {
        default: false,
        type: Boolean
    },
    quickCreateURL: {
        default: null,
        type: [String, Boolean]
    },
    selected: {
        default: false,
        type: Boolean
    },
    spoilSurprises: {
        default: false,
        type: Boolean
    },
    type: {
        default: "default",
        type: String
    }
});

const userAvatar = (name) => {
    return avatars.getInitials(name, 32, 32);
};
</script>

<style lang="scss" scoped>
.list-card {
    &.selectable {
        cursor: pointer;
    }
    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
}

.list-limit-chip {
    position: relative;
    .progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: max-content;

        .v-progress-linear {
            width: 100%;
        }
    }
}


:deep(.v-card-title) {
    .title-container {
        display: grid;
        grid-template-columns: 1fr max-content;
        align-items: center;
        gap: 1rem;
    
        h2, h3 {
            word-break: break-word;
            white-space: pre-wrap;
            word-wrap: normal;
        }
    
        h2 {
            @media screen and (max-width: 768px){
                font-size: 1.5rem;
            }
        }
    }
}
:deep(.v-card-subtitle) {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    .avatar {
        display: block;
        border-radius: 50%;
        box-sizing: border-box;
    }
    word-break: break-word;
    white-space: pre-wrap;
}

.mobile-list-buttons {
    text-align: center;
}
</style>
