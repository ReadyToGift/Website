<template>
    <div class="wedding-create-item-fab">
        <ModifyItem
            :list="list"
            :currency="list.currency"
            :wishlist-owner="true"
            :wedding-list="true"
            @newItem="handleNewItem"
        />
    </div>
    <GlobalDialogs />
</template>

<script setup>
import ModifyItem from "@/components/dialogs/ModifyItem.vue";
import GlobalDialogs from "@/components/GlobalDialogs.vue";

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
