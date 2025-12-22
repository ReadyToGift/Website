<template>
    <v-form
        class="d-flex flex-column ga-4"
        validate-on="blur"
        @submit.prevent
    >
        <v-text-field
            label="Title"
            v-model.trim="item.title"
            maxlength="128"
            counter
            :autofocus="!item.url"
            :rules="[() => !!item.title || 'Title is required']"
            hide-details="auto"
            :base-color="previousValues.title && previousValues.title !== item.title ? 'primary' : undefined"
            :color="previousValues.title && previousValues.title !== item.title ? 'primary' : undefined"
        >
            <template #details>
                <RevertPrompt
                    v-if="previousValues.title && previousValues.title !== item.title"
                    :previous-value="previousValues.title"
                    @revert="revertValue('title')"
                />
            </template>
        </v-text-field>

        <v-textarea
            label="Description"
            v-model.trim="item.description"
            maxlength="4000"
            counter
            persistent-hint
            hint="This field supports markdown!"
            class="mb-2"
            hide-details="auto"
            :base-color="previousValues.description && previousValues.description !== item.description ? 'primary' : undefined"
            :color="previousValues.description && previousValues.description !== item.description ? 'primary' : undefined"
        >
            <template #details>
                <RevertPrompt
                    v-if="previousValues.description && previousValues.description !== item.description"
                    :previous-value="previousValues.description"
                    @revert="revertValue('description')"
                />
            </template>
        </v-textarea>
        <v-text-field
            type="url"
            label="Website"
            v-model.trim="item.url"
            :prepend-icon="mdiLink"
            :rules="[validateUrl]"
            :error-messages="errors.url"
            hide-details="auto"
            :base-color="previousValues.url && previousValues.url !== item.url ? 'primary' : undefined"
            :color="previousValues.url && previousValues.url !== item.url ? 'primary' : undefined"
        >
            <template #details>
                <RevertPrompt
                    v-if="previousValues.url && previousValues.url !== item.url"
                    :previous-value="previousValues.url"
                    @revert="revertValue('url')"
                />
            </template>
        </v-text-field>
        <div
            class="image"
        >
            <v-text-field
                type="url"
                label="Image"
                v-model.trim="item.image"
                :prepend-icon="mdiFileLink"
                persistent-hint
                hint="This should be a direct link to an image."
                v-show="!item.imageID && !item.imageFile"
                hide-details="auto"
            />
            <v-file-input
                :prepend-icon="mdiImage"
                v-model="item.imageFile"
                accept=".png,.jpg,.jpeg,.webp"
                label="Image"
                clearable
                show-size="1000"
                ref="image-upload-input"
                v-show="item.imageID || item.imageFile"
                @change="fileUploaded"
                @click:clear="fileRemoved"
            />
            <v-btn
                :prepend-icon="mdiUpload"
                variant="tonal"
                color="primary"
                @click="uploadImage"
                rounded="sm"
                size="x-large"
                :loading="uploadingFile"
            >
                Max 20MB
            </v-btn>
        </div>
        <v-text-field
            type="number"
            label="Price"
            step="0.01"
            placeholder="0"
            v-model="item.price"
            :prefix="currencyStore.getCurrency(currency).symbol"
            :prepend-icon="mdiCash"
            hide-details="auto"
            :base-color="previousValues.price && previousValues.price !== item.price ? 'primary' : undefined"
            :color="previousValues.price && previousValues.price !== item.price ? 'primary' : undefined"
            persistent-hint
            hint="Leave this blank or set it to 0 to place it in the &quot;Flexible Gifts&quot; category"
        >
            <template #details>
                <RevertPrompt
                    v-if="previousValues.price && previousValues.price !== item.price"
                    :previous-value="currencyStore.getCurrency(currency).symbol + previousValues.price"
                    @revert="revertValue('price')"
                />
            </template>
        </v-text-field>
        <v-switch
            label="Show Price"
            v-model="item.displayPrice"
            color="primary"
            inset
            hide-details="auto"
        />
        <v-select
            label="Priority"
            v-model="item.priority"
            :items="
                Object.entries(priorityMap).map((priority) => ({
                    title: priority[1].text,
                    value: priority[0]
                }))
            "
            v-if="wishlistOwner"
            hide-details="auto"
        />
    </v-form>
</template>

<script setup>
import { mdiCash, mdiFileLink, mdiImage, mdiLink, mdiUpload } from "@mdi/js";
import { ref, useTemplateRef } from "vue";
import { VBtn, VFileInput, VForm, VSelect, VSwitch, VTextarea, VTextField } from "vuetify/components";
import currencyStore from "@/stores/currency";
import { priorityMap } from "@/utils";
import RevertPrompt from "@/components/RevertPrompt.vue";
import validation from "@/utils/validation";

const emit = defineEmits(["file-state"]);

const item = defineModel("item");

const imageUploadInput = useTemplateRef("image-upload-input");

let newFileUploaded = ref(false);

const uploadImage = () => {
    imageUploadInput.value.click();
};

const fileUploaded = () => {
    const file = imageUploadInput.value.files[0];
    if (file) {
        newFileUploaded.value = true;
        if (item.value && item.value.imageID) {
            emit("file-state", "replaced");
        } else {
            emit("file-state", "added");
        }
    }
};

const fileRemoved = () => {
    emit("file-state", "removed");
};

const props = defineProps({
    currency: {
        required: true,
        type: String
    },
    errors: {
        default: () => ({}),
        type: Object
    },
    previousValues: {
        default: () => ({}),
        type: Object
    },
    uploadingFile: {
        default: false,
        type: Boolean
    },
    wishlistOwner: {
        default: false,
        type: Boolean
    }
});

const validateUrl = (url) => {
    return url === "" || validation.urlRegex.test(url) ? true : "Invalid URL";
};

const revertValue = (field) => {
    if (item.value && field in item.value && field in props.previousValues) {
        item.value[field] = props.previousValues[field];
    }
};
</script>

<style scoped>
.v-input--error {
    margin-bottom: 5px;
}

.image {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;

    @media screen and (max-width: 768px){
        flex-direction: column;
        gap: 1rem;

        .v-btn {
            margin-bottom: 1rem;
        }
    }
}

:deep(.v-counter) {
    margin-left: 0.5rem;
}
</style>
