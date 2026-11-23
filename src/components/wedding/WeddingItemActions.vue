<template>
    <div class="wedding-item-actions">
        <FulfillItem
            v-if="showFulfillment"
            :item="item"
            :instant="wishlistOwner && list.spoilSurprises"
            variant="outlined"
            @fulfillItem="reload"
            @unfulfillItem="reload"
        />
        <v-btn
            v-if="websiteUrl"
            :href="websiteUrl"
            :prepend-icon="mdiOpenInNew"
            target="_blank"
            variant="outlined"
        >
            Open Website
        </v-btn>
        <ModifyItem
            v-if="wishlistOwner && !item.communityList"
            :currency="currency"
            :item="item"
            :list="list"
            variant="outlined"
            :wishlist-owner="wishlistOwner"
            :wedding-list="true"
            @editItem="reload"
        />
        <DeleteItem
            v-if="wishlistOwner && !item.communityList"
            :item="item"
            variant="outlined"
            @removeItem="reload"
        />
    </div>
</template>

<script setup>
import { mdiOpenInNew } from "@mdi/js";
import { computed } from "vue";
import DeleteItem from "@/components/dialogs/DeleteItem.vue";
import FulfillItem from "@/components/dialogs/FulfillItem.vue";
import ModifyItem from "@/components/dialogs/ModifyItem.vue";

const props = defineProps({
    currency: {
        required: true,
        type: String,
    },
    item: {
        required: true,
        type: Object,
    },
    list: {
        required: true,
        type: Object,
    },
    showFulfillment: {
        default: true,
        type: Boolean,
    },
    wishlistOwner: {
        default: false,
        type: Boolean,
    },
});

const websiteUrl = computed(() => {
    if (typeof props.item.url !== "string") return null;

    try {
        const url = new URL(props.item.url);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
});

const reload = () => window.location.reload();
</script>

<style scoped>
.wedding-item-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
}

.wedding-item-actions :deep(.v-btn) {
    background: var(--wedding-button, #9bcbed);
    border: 0;
    border-radius: 0.3rem;
    color: #101820;
    font-family: Georgia, "Times New Roman", serif !important;
    font-size: 1.2rem;
    min-height: 3.25rem;
    text-transform: none;
}

.wedding-item-actions :deep(.v-btn:first-child) {
    min-width: 10rem;
}

@media (max-width: 768px) {
    .wedding-item-actions {
        justify-content: stretch;
    }

    .wedding-item-actions :deep(.v-btn) {
        flex: 1 1 auto;
    }
}
</style>
