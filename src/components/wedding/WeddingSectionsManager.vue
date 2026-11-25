<template>
    <div class="wedding-sections-manager">
        <WeddingSectionsEditor
            v-model:sections="sections"
            :saving="saving"
            :save-error="saveError"
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
const saveError = ref("");

const saveSections = async (updatedSections) => {
    saving.value = true;
    saveError.value = "";
    try {
        const [, error] = await handleFetch("/api/content/list", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                listId: props.list.id,
                updateData: { weddingSections: updatedSections },
            }),
        });
        if (error) {
            saveError.value = error.message || "Could not save sections.";
        } else {
            window.location.reload();
        }
    } catch {
        saveError.value = "Could not save sections. Please try again.";
    } finally {
        saving.value = false;
    }
};
</script>

<style scoped>
.wedding-sections-manager {
    margin: 1rem 0;
    display: flex;
    justify-content: center;
}
</style>
