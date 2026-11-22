<template>
    <section class="sections-editor">
        <v-dialog v-model="cropDialog" max-width="800px">
            <v-card>
                <v-card-title>Crop section image</v-card-title>
                <v-card-text>
                    <Cropper
                        ref="cropper"
                        class="section-cropper"
                        :src="cropperSource"
                        :stencil-props="{ aspectRatio: cropAspect }"
                    />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="cancelCrop">Cancel</v-btn>
                    <v-btn color="primary" @click="saveCrop">Use image</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <div class="editor-header">
            <div class="editor-actions">
                <template v-if="editing">
                    <v-btn variant="text" @click="discard">Discard</v-btn>
                    <v-btn color="primary" :loading="saving" @click="save">
                        Save sections
                    </v-btn>
                </template>
                <v-btn
                    v-else
                    :prepend-icon="mdiPencil"
                    color="primary"
                    variant="outlined"
                    @click="startEditing"
                >
                    Edit sections
                </v-btn>
            </div>
        </div>

        <template v-if="editing">
            <v-alert type="info" variant="tonal">
                Choose a layout, then fill in the placeholders with your
                content.
            </v-alert>

            <v-card
                v-for="(section, index) in draftSections"
                :key="section.id"
                variant="outlined"
            >
                <v-card-title class="d-flex align-center justify-space-between">
                    Section {{ index + 1 }}
                    <v-btn
                        :icon="mdiDelete"
                        aria-label="Remove section"
                        color="error"
                        variant="text"
                        @click="removeSection(index)"
                    />
                </v-card-title>
                <v-card-text class="section-editor-card">
                    <div
                        class="section-preview edit-preview"
                        :class="`preview-${section.type}`"
                    >
                        <div
                            v-if="section.type !== 'image'"
                            class="preview-copy"
                        >
                            <v-text-field
                                v-model.trim="section.title"
                                class="preview-title"
                                hide-details
                                maxlength="128"
                                placeholder="Heading placeholder"
                                variant="outlined"
                            />
                            <v-textarea
                                v-model="section.text"
                                class="preview-body"
                                auto-grow
                                hide-details
                                maxlength="4000"
                                placeholder="Text placeholder"
                                rows="5"
                                variant="outlined"
                            />
                        </div>
                        <button
                            v-if="section.type !== 'text'"
                            class="image-placeholder"
                            type="button"
                            aria-label="Change section image"
                            @click="openFilePicker(section)"
                        >
                            <img
                                v-if="imageFor(section)"
                                :src="imageFor(section)"
                                alt=""
                            >
                            <span v-else>Image placeholder</span>
                        </button>
                    </div>
                    <input
                        v-for="fileSection in [section]"
                        :key="`${fileSection.id}-file`"
                        :ref="(element) => setFileInput(fileSection, element)"
                        class="hidden-file-input"
                        type="file"
                        accept="image/*"
                        @change="
                            (event) => openCropper(section, event.target.files)
                        "
                    >
                    <v-select
                        v-model="section.type"
                        :items="sectionTypes"
                        label="Layout"
                        hide-details="auto"
                        @update:model-value="typeChanged(section)"
                    />
                </v-card-text>
            </v-card>
            <v-btn
                :prepend-icon="mdiPlus"
                color="primary"
                variant="outlined"
                @click="addSection"
            >
                Add section
            </v-btn>
        </template>
    </section>
</template>

<script setup>
import { mdiDelete, mdiPencil, mdiPlus } from "@mdi/js";
import { ref } from "vue";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

defineProps({
    saving: {
        default: false,
        type: Boolean,
    },
});
const sections = defineModel("sections", { default: () => [] });
const emit = defineEmits(["save"]);
const editing = ref(false);
const draftSections = ref([]);
const cropDialog = ref(false);
const cropper = ref(null);
const cropperSource = ref("");
const cropSection = ref(null);
const cropAspect = ref(1);
const cropMaxWidth = ref(800);
const fileInputs = ref({});
const sectionTypes = [
    { title: "Text", value: "text" },
    { title: "Image", value: "image" },
    { title: "Image and text", value: "image-text" },
    { title: "Text and image", value: "text-image" },
];
const cloneSections = (value) => JSON.parse(JSON.stringify(value || []));
const imageFor = (section) =>
    section.imageUrl || section.imageData || section.image || "";

const startEditing = () => {
    document.querySelector("[data-wedding-sections]")?.replaceChildren();
    draftSections.value = cloneSections(sections.value).map((section) => {
        if (section.image && !section.imageUrl && !section.imageData) {
            if (section.image.startsWith("data:image/")) {
                section.imageData = section.image;
            } else {
                section.imageUrl = section.image;
            }
            delete section.image;
        }
        return section;
    });
    editing.value = true;
};

const discard = () => {
    window.location.reload();
};

const addSection = () => {
    draftSections.value.push({
        id: crypto.randomUUID(),
        text: "",
        title: "",
        type: "text",
    });
};

const removeSection = (index) => draftSections.value.splice(index, 1);

const setFileInput = (section, element) => {
    if (element) fileInputs.value[section.id] = element;
};

const openFilePicker = (section) => {
    fileInputs.value[section.id]?.click();
};

const typeChanged = (section) => {
    if (section.type === "image") {
        section.title = "";
        section.text = "";
    }
};

const openCropper = (section, file) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (!selectedFile || selectedFile.size > 4 * 1024 * 1024) return;
    if (file?.length) fileInputs.value[section.id].value = "";
    cropSection.value = section;
    cropAspect.value = section.type === "image" ? 3 : 4 / 3;
    cropMaxWidth.value = section.type === "image" ? 1600 : 800;
    cropperSource.value = URL.createObjectURL(selectedFile);
    cropDialog.value = true;
};

const cancelCrop = () => {
    URL.revokeObjectURL(cropperSource.value);
    cropperSource.value = "";
    cropSection.value = null;
    cropDialog.value = false;
};

const saveCrop = () => {
    const result = cropper.value?.getResult();
    const sourceCanvas = result?.canvas;
    const section = cropSection.value;
    if (!sourceCanvas || !section) return;

    const width = Math.min(cropMaxWidth.value, sourceCanvas.width);
    const height = Math.round(width / cropAspect.value);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas
        .getContext("2d")
        .drawImage(
            sourceCanvas,
            0,
            0,
            sourceCanvas.width,
            sourceCanvas.height,
            0,
            0,
            width,
            height,
        );
    section.imageData = canvas.toDataURL("image/jpeg", 0.9);
    delete section.imageUrl;
    delete section.image;
    cancelCrop();
};

const save = () => {
    emit("save", draftSections.value);
    editing.value = false;
};
</script>

<style scoped>
.sections-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.editor-header {
    align-items: center;
    display: flex;
    gap: 1rem;
    justify-content: space-between;
}
.editor-header h2,
.editor-header p {
    margin: 0;
}
.editor-header p {
    margin-top: 0.25rem;
}
.editor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}
.section-cropper {
    height: min(60vh, 30rem);
}
.empty-preview {
    border: 1px dashed rgb(var(--v-theme-outline));
    border-radius: 0.75rem;
    padding: 2rem;
}
.section-editor-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.hidden-file-input {
    display: none;
}
.preview-copy {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
}
.preview-title,
.preview-body {
    min-width: 0;
    width: 100%;
}
.preview-title :deep(.v-field__input) {
    font-size: 1.5rem;
    font-weight: 700;
}
.preview-body :deep(.v-field__input) {
    min-height: 5rem;
}
.section-preview {
    align-items: center;
    border-radius: 0.75rem;
    display: grid;
    gap: 2rem;
    min-height: 8rem;
    padding: 1.5rem;
}
.section-preview h3,
.section-preview p {
    margin: 0;
    white-space: pre-wrap;
}
.section-preview h3 {
    font-size: 1.5rem;
}
.section-preview img {
    border-radius: 0.5rem;
    max-height: 20rem;
    max-width: 100%;
    object-fit: cover;
    width: 100%;
}
.preview-text {
    background: transparent;
    grid-template-columns: 1fr;
    padding-left: 0;
    padding-right: 0;
}
.preview-image {
    background: transparent;
    grid-template-columns: 1fr;
    padding-left: 0;
    padding-right: 0;
}
.image-placeholder {
    align-items: center;
    background: rgb(var(--v-theme-surface));
    border-radius: 0.5rem;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: flex;
    font: inherit;
    justify-content: center;
    min-height: 8rem;
    opacity: 0.75;
    overflow: hidden;
    padding: 0;
    width: 100%;
}
.image-placeholder:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
}
.preview-image-text,
.preview-text-image {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}
.preview-text-image .preview-copy {
    grid-column: 1;
    grid-row: 1;
}
.preview-text-image img,
.preview-text-image .image-placeholder {
    grid-column: 2;
    grid-row: 1;
}
.preview-image-text .preview-copy {
    grid-column: 2;
    grid-row: 1;
}
.preview-image-text img,
.preview-image-text .image-placeholder {
    grid-column: 1;
    grid-row: 1;
}
.image-placeholder img {
    height: 100%;
    object-fit: cover;
}
@media (max-width: 768px) {
    .editor-header {
        align-items: flex-start;
        flex-direction: column;
    }
    .preview-image-text,
    .preview-text-image {
        grid-template-columns: 1fr;
    }
    .preview-image-text .preview-copy,
    .preview-text-image .preview-copy,
    .preview-image-text img,
    .preview-image-text .image-placeholder,
    .preview-text-image img,
    .preview-text-image .image-placeholder {
        grid-column: auto;
        grid-row: auto;
    }
    .preview-image-text .preview-copy {
        order: 2;
    }
    .preview-image-text img,
    .preview-image-text .image-placeholder {
        order: 1;
    }
}
</style>
