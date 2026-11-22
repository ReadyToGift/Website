<template>
    <div class="wedding-sections-manager">
        <WeddingSectionsEditor
            v-model:sections="sections"
            :saving="saving"
            @save="saveSections"
        />
    </div>
</template>

<script setup>
import { ref } from "vue";
import WeddingSectionsEditor from "@/components/wedding/WeddingSectionsEditor.vue";
import { handleFetch } from "@/utils/handleFetch";

const props = defineProps({
    list: {
        required: true,
        type: Object,
    },
});

const cloneSections = (value) => JSON.parse(JSON.stringify(value || []));
const sections = ref(cloneSections(props.list.weddingSections));
const saving = ref(false);

const saveSections = async (updatedSections) => {
    saving.value = true;
    const [, error] = await handleFetch("/api/content/list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            listId: props.list.id,
            updateData: { weddingSections: updatedSections },
        }),
    });

    saving.value = false;
    if (!error) window.location.reload();
};
</script>

<style scoped>
.wedding-sections-manager {
    margin-bottom: 1rem;
}
</style>
