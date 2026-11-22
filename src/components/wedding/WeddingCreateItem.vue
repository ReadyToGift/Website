<template>
    <div class="wedding-create-item-fab">
        <ModifyItem
            :list="list"
            :currency="list.currency"
            :wishlist-owner="true"
            @newItem="handleNewItem"
        />
    </div>
</template>

<script setup>
import ModifyItem from "@/components/dialogs/ModifyItem.vue";

defineProps({
    list: {
        required: true,
        type: Object,
    },
});

const handleNewItem = () => {
    window.location.reload();
};
</script>

<style scoped>
.wedding-create-item-fab {
    bottom: 1.5rem;
    position: fixed;
    right: 1.5rem;
    z-index: 5;
}
</style>
