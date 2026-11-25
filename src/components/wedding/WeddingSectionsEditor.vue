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
                    <v-btn
                        color="primary"
                        :loading="saving || processingImages"
                        @click="save"
                    >
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
            <v-alert
                v-if="uploadError || saveError"
                type="error"
                variant="tonal"
            >
                {{ uploadError || saveError }}
            </v-alert>

            <v-card
                v-for="(section, index) in draftSections"
                :key="section.id"
                variant="outlined"
            >
                <v-card-title class="d-flex align-center justify-space-between">
                    Section {{ index + 1 }}
                    <div class="section-order-actions">
                        <v-btn
                            :icon="mdiArrowUp"
                            :disabled="index === 0"
                            :aria-label="`Move section ${index + 1} up`"
                            variant="text"
                            @click="moveSection(index, -1)"
                        />
                        <v-btn
                            :icon="mdiArrowDown"
                            :disabled="index === draftSections.length - 1"
                            :aria-label="`Move section ${index + 1} down`"
                            variant="text"
                            @click="moveSection(index, 1)"
                        />
                        <v-btn
                            :icon="mdiDelete"
                            aria-label="Remove section"
                            color="error"
                            variant="text"
                            @click="removeSection(index)"
                        />
                    </div>
                </v-card-title>
                <v-card-text class="section-editor-card">
                    <div
                        class="section-preview edit-preview"
                        :class="`preview-${section.type}`"
                    >
                        <div
                            v-if="
                                section.type !== 'image' &&
                                section.type !== 'gallery'
                            "
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
                            v-if="
                                section.type !== 'text' &&
                                section.type !== 'gallery'
                            "
                            class="image-placeholder"
                            :class="{ 'has-image': imageFor(section) }"
                            type="button"
                            :aria-label="
                                imageFor(section)
                                    ? 'Drag to reposition image, or click to change it. Use arrow keys for fine adjustments.'
                                    : 'Add section image'
                            "
                            @click="handleImageClick(section)"
                            @pointerdown="startDrag($event, section)"
                            @pointermove="moveDrag"
                            @pointerup="stopDrag"
                            @pointercancel="stopDrag"
                            @lostpointercapture="stopDrag"
                            @keydown="nudgeFocus($event, section)"
                        >
                            <img
                                v-if="imageFor(section)"
                                :src="imageFor(section)"
                                :style="{
                                    objectPosition: focusPosition(section),
                                }"
                                alt=""
                                draggable="false"
                            >
                            <span v-else>Image placeholder</span>
                        </button>
                        <div
                            v-if="section.type === 'gallery'"
                            class="gallery-editor"
                        >
                            <div
                                v-if="section.images?.length"
                                class="gallery-preview"
                            >
                                <div
                                    v-for="(photo, photoIndex) in section.images"
                                    :key="
                                        photo.id || photo.imageUrl || photoIndex
                                    "
                                    class="gallery-photo"
                                >
                                    <img
                                        :src="imageFor(photo)"
                                        :width="photo.width"
                                        :height="photo.height"
                                        :style="{
                                            aspectRatio:
                                                photo.width && photo.height
                                                    ? `${photo.width} / ${photo.height}`
                                                    : undefined,
                                            objectPosition:
                                                focusPosition(photo),
                                        }"
                                        alt=""
                                        draggable="false"
                                    >
                                    <button
                                        type="button"
                                        class="gallery-drag-target"
                                        :aria-label="`Photo ${photoIndex + 1}. Drag to reposition. Use arrow keys for fine adjustments.`"
                                        @pointerdown="startDrag($event, photo)"
                                        @pointermove="moveDrag"
                                        @pointerup="stopDrag"
                                        @pointercancel="stopDrag"
                                        @lostpointercapture="stopDrag"
                                        @keydown="nudgeFocus($event, photo)"
                                    />
                                    <button
                                        type="button"
                                        class="gallery-remove"
                                        :disabled="processingImages"
                                        :aria-label="`Remove photo ${photoIndex + 1}`"
                                        @click="
                                            removeGalleryImage(
                                                section,
                                                photoIndex,
                                            )
                                        "
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <p v-if="section.images?.length" class="focus-hint">
                                Drag photos to reposition them. Arrow keys also
                                work.
                            </p>
                            <button
                                v-if="
                                    (section.images?.length || 0) <
                                    maxGalleryImages
                                "
                                type="button"
                                class="gallery-add"
                                :disabled="processingImages"
                                @click="openFilePicker(section)"
                            >
                                Add photos ({{ section.images?.length || 0 }}/{{
                                    maxGalleryImages
                                }})
                            </button>
                        </div>
                    </div>
                    <p
                        v-if="
                            section.type !== 'gallery' &&
                            section.type !== 'text' &&
                            imageFor(section)
                        "
                        class="focus-hint"
                    >
                        Drag the image to reposition it. Click to replace it.
                    </p>
                    <input
                        v-for="fileSection in [section]"
                        :key="`${fileSection.id}-file`"
                        :ref="(element) => setFileInput(fileSection, element)"
                        class="hidden-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        :multiple="section.type === 'gallery'"
                        @change="
                            (event) => handleFiles(section, event.target.files)
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
import {
    mdiArrowDown,
    mdiArrowUp,
    mdiDelete,
    mdiPencil,
    mdiPlus,
} from "@mdi/js";
import { ref } from "vue";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import {
    focusAfterDrag,
    focusPosition,
    normalizeFocus,
} from "@/utils/weddingFocus";

defineProps({
    saveError: {
        default: "",
        type: String,
    },
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
const uploadError = ref("");
const processingImages = ref(false);
let activeDrag = null;
let suppressFileClickUntil = 0;
const maxGalleryImages = 6;
const sectionTypes = [
    { title: "Text", value: "text" },
    { title: "Image", value: "image" },
    { title: "Photo gallery", value: "gallery" },
    { title: "Image and text", value: "image-text" },
    { title: "Text and image", value: "text-image" },
];
const cloneSections = (value) => JSON.parse(JSON.stringify(value || []));
const imageFor = (section) =>
    section.imageUrl || section.imageData || section.image || "";

const startEditing = () => {
    document
        .querySelectorAll(".wedding-theme > [data-wedding-section]")
        .forEach((section) => {
            section.remove();
        });
    draftSections.value = cloneSections(sections.value).map((section) => {
        if (section.image && !section.imageUrl && !section.imageData) {
            if (section.image.startsWith("data:image/")) {
                section.imageData = section.image;
            } else {
                section.imageUrl = section.image;
            }
            delete section.image;
        }
        section.focusX = normalizeFocus(section.focusX);
        section.focusY = normalizeFocus(section.focusY);
        if (Array.isArray(section.images)) {
            section.images = section.images.map((photo) => ({
                ...photo,
                focusX: normalizeFocus(photo.focusX),
                focusY: normalizeFocus(photo.focusY),
            }));
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

const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draftSections.value.length) return;
    const [section] = draftSections.value.splice(index, 1);
    draftSections.value.splice(target, 0, section);
};

const setFileInput = (section, element) => {
    if (element) fileInputs.value[section.id] = element;
};

const openFilePicker = (section) => {
    fileInputs.value[section.id]?.click();
};

const handleImageClick = (section) => {
    if (performance.now() < suppressFileClickUntil) return;
    openFilePicker(section);
};

const startDrag = (event, image) => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (event.target instanceof Element) {
        const button = event.target.closest("button");
        if (button && button !== event.currentTarget) return;
    }

    const element = event.currentTarget;
    const photo =
        element.querySelector("img") ||
        element.parentElement?.querySelector("img");
    if (!photo?.naturalWidth || !photo?.naturalHeight) return;

    const frame = photo.getBoundingClientRect();
    const scale = Math.max(
        frame.width / photo.naturalWidth,
        frame.height / photo.naturalHeight,
    );
    activeDrag = {
        element,
        image,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        focusX: normalizeFocus(image.focusX),
        focusY: normalizeFocus(image.focusY),
        overflowX: Math.max(0, photo.naturalWidth * scale - frame.width),
        overflowY: Math.max(0, photo.naturalHeight * scale - frame.height),
        moved: false,
    };
    element.setPointerCapture(event.pointerId);
};

const moveDrag = (event) => {
    if (
        !activeDrag ||
        activeDrag.pointerId !== event.pointerId ||
        activeDrag.element !== event.currentTarget
    )
        return;
    const deltaX = event.clientX - activeDrag.startX;
    const deltaY = event.clientY - activeDrag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) activeDrag.moved = true;
    if (!activeDrag.moved) return;

    activeDrag.image.focusX = focusAfterDrag(
        activeDrag.focusX,
        deltaX,
        activeDrag.overflowX,
    );
    activeDrag.image.focusY = focusAfterDrag(
        activeDrag.focusY,
        deltaY,
        activeDrag.overflowY,
    );
};

const stopDrag = (event) => {
    if (
        !activeDrag ||
        activeDrag.pointerId !== event.pointerId ||
        activeDrag.element !== event.currentTarget
    )
        return;
    if (activeDrag.moved && event.currentTarget.matches(".image-placeholder"))
        suppressFileClickUntil = performance.now() + 350;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    activeDrag = null;
};

const nudgeFocus = (event, image) => {
    if (event.target !== event.currentTarget) return;
    const step = event.shiftKey ? 10 : 5;
    const directions = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    image.focusX = normalizeFocus(normalizeFocus(image.focusX) + direction[0]);
    image.focusY = normalizeFocus(normalizeFocus(image.focusY) + direction[1]);
};

const typeChanged = (section) => {
    if (section.type === "gallery") {
        const existingImage = imageFor(section);
        section.images = Array.isArray(section.images) ? section.images : [];
        if (existingImage) {
            section.images.unshift(
                section.imageData
                    ? {
                          imageData: section.imageData,
                          focusX: section.focusX,
                          focusY: section.focusY,
                      }
                    : {
                          imageUrl: existingImage,
                          focusX: section.focusX,
                          focusY: section.focusY,
                      },
            );
        }
        delete section.imageData;
        delete section.imageUrl;
        delete section.image;
        section.title = "";
        section.text = "";
        return;
    }
    if (Array.isArray(section.images)) {
        const firstPhoto = section.images[0];
        if (section.type !== "text" && firstPhoto) {
            if (firstPhoto.imageData) section.imageData = firstPhoto.imageData;
            if (firstPhoto.imageUrl) section.imageUrl = firstPhoto.imageUrl;
            section.focusX = normalizeFocus(firstPhoto.focusX);
            section.focusY = normalizeFocus(firstPhoto.focusY);
        }
        delete section.images;
    }
    if (section.type === "image") {
        section.title = "";
        section.text = "";
    }
};

const removeGalleryImage = (section, index) => {
    section.images.splice(index, 1);
};

const prepareGalleryImage = async (file) => {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return {
            id: crypto.randomUUID(),
            imageData: canvas.toDataURL("image/jpeg", 0.82),
            width: canvas.width,
            height: canvas.height,
            focusX: 50,
            focusY: 50,
        };
    } finally {
        bitmap.close();
    }
};

const handleFiles = async (section, fileList) => {
    const files = Array.from(fileList || []);
    if (fileInputs.value[section.id]) fileInputs.value[section.id].value = "";
    if (!files.length || processingImages.value) return;
    uploadError.value = "";
    if (section.type !== "gallery") {
        openCropper(section, files);
        return;
    }

    section.images = Array.isArray(section.images) ? section.images : [];
    if (files.length + section.images.length > maxGalleryImages) {
        uploadError.value = `A gallery can have up to ${maxGalleryImages} photos.`;
        return;
    }
    if (
        files.some(
            (file) =>
                ![
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/gif",
                ].includes(file.type) || file.size > 20 * 1024 * 1024,
        )
    ) {
        uploadError.value =
            "Choose JPEG, PNG, WebP, or GIF images under 20 MB each.";
        return;
    }

    processingImages.value = true;
    try {
        const preparedImages = [];
        for (const file of files) {
            preparedImages.push(await prepareGalleryImage(file));
        }
        section.images.push(...preparedImages);
    } catch {
        uploadError.value =
            "One of the photos could not be processed. Try another image.";
    } finally {
        processingImages.value = false;
    }
};

const openCropper = (section, files) => {
    const selectedFile = files?.[0];
    if (fileInputs.value[section.id]) fileInputs.value[section.id].value = "";
    if (!selectedFile || selectedFile.size > 4 * 1024 * 1024) return;
    cropSection.value = section;
    const galleryIndex = draftSections.value.findIndex(
        (entry) => entry.id === section.id,
    );
    const isGalleryImage =
        galleryIndex >= 0 &&
        galleryIndex < 3 &&
        draftSections.value.slice(0, 3).length === 3 &&
        draftSections.value
            .slice(0, 3)
            .every((entry) => entry.type === "image");
    cropAspect.value = isGalleryImage
        ? [1.45, 2 / 3, 1.3][galleryIndex]
        : section.type === "image"
          ? 16 / 9
          : 4 / 3;
    cropMaxWidth.value = isGalleryImage
        ? [1000, 600, 1000][galleryIndex]
        : section.type === "image"
          ? 1600
          : 800;
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
    section.focusX = 50;
    section.focusY = 50;
    delete section.imageUrl;
    delete section.image;
    cancelCrop();
};

const save = () => {
    uploadError.value = "";
    if (
        draftSections.value.some(
            (section) =>
                section.type === "gallery" && (section.images?.length || 0) < 2,
        )
    ) {
        uploadError.value =
            "Add at least two photos to each gallery before saving.";
        return;
    }
    emit("save", draftSections.value);
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
.section-order-actions {
    display: flex;
    align-items: center;
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
.preview-image .image-placeholder {
    aspect-ratio: 16 / 9;
    min-height: 0;
}
.preview-image .image-placeholder img {
    max-height: none;
}
.preview-gallery {
    grid-template-columns: 1fr;
}
.gallery-editor {
    min-width: 0;
}
.gallery-preview {
    align-items: stretch;
    display: flex;
    gap: 0.5rem;
    height: clamp(12rem, 28vw, 24rem);
    justify-content: center;
    max-height: 24rem;
}
.gallery-photo {
    flex: 0 1 auto;
    height: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    position: relative;
    user-select: none;
}
.gallery-drag-target {
    background: transparent;
    border: 0;
    cursor: grab;
    inset: 0;
    position: absolute;
    touch-action: none;
    width: 100%;
}
.gallery-drag-target:active {
    cursor: grabbing;
}
.gallery-drag-target:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: -2px;
}
.gallery-preview .gallery-photo img {
    border-radius: 0;
    height: 100%;
    max-width: 100%;
    object-fit: cover;
    width: auto;
}
.gallery-remove {
    background: rgb(255 255 255 / 0.9);
    border: 0;
    border-radius: 50%;
    color: #111;
    cursor: pointer;
    font-size: 1.4rem;
    height: 2rem;
    line-height: 1;
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    width: 2rem;
    z-index: 1;
}
.gallery-add {
    background: transparent;
    border: 1px dashed currentColor;
    border-radius: 0.5rem;
    color: inherit;
    cursor: pointer;
    font: inherit;
    margin-top: 0.75rem;
    min-height: 3rem;
    width: 100%;
}
.gallery-add:focus-visible,
.gallery-remove:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
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
.image-placeholder.has-image {
    cursor: grab;
    touch-action: none;
    user-select: none;
}
.image-placeholder.has-image:active {
    cursor: grabbing;
}
.focus-hint {
    color: rgb(var(--v-theme-on-surface) / 0.7);
    font-size: 0.875rem;
    margin: 0.5rem 0 0;
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
    .gallery-preview {
        height: 17rem;
        justify-content: flex-start;
        overflow-x: auto;
    }

    .gallery-photo {
        flex: 0 0 auto;
        max-width: 76vw;
    }
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
