<template>
    <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                aria-label="Wedding list actions"
                :icon="mdiDotsVertical"
            />
        </template>

        <div class="wedding-header-actions-menu">
            <EditList :list="list" compact @updateList="handleUpdate" />
            <DeleteList :list="list" compact />
            <v-btn
                :icon="mdiShare"
                title="Share List"
                variant="tonal"
                @click="copyListURL"
            />
        </div>
    </v-menu>

    <v-snackbar
        v-model="shareSnackbarOpen"
        color="primary"
        rounded="pill"
        :timeout="2000"
        text="Link copied to clipboard"
    />
</template>

<script setup>
import { mdiDotsVertical, mdiShare } from "@mdi/js";
import { ref } from "vue";
import "vuetify/styles";
import DeleteList from "@/components/dialogs/DeleteList.vue";
import EditList from "@/components/dialogs/EditList.vue";

defineProps({
    list: {
        required: true,
        type: Object,
    },
});

const shareSnackbarOpen = ref(false);

const copyListURL = async () => {
    const listURL = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({ url: listURL });
            return;
        } catch (error) {
            if (error?.name === "AbortError") return;
        }
    }

    await navigator.clipboard.writeText(listURL);
    shareSnackbarOpen.value = true;
};

const handleUpdate = ({ list: updatedList }) => {
    if (updatedList?.shortUrl) {
        window.location.assign(
            `/wedding/${encodeURIComponent(updatedList.shortUrl)}`,
        );
    } else {
        window.location.reload();
    }
};
</script>

<style scoped>
.wedding-header-actions-menu {
    align-items: center;
    background: rgb(var(--v-theme-surface));
    border-radius: 0.75rem;
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.2);
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
}
</style>
