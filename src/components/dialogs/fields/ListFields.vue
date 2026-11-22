<template>
    <v-text-field
        label="Title"
        v-model.trim="list.title"
        maxlength="128"
        counter
        autofocus
        hide-details="auto"
    >
        <template #details>
            <RevertPrompt
                v-if="
                    previousValues.title && previousValues.title !== list.title
                "
                :previous-value="previousValues.title"
                @revert="revertValue('title')"
            />
        </template>
    </v-text-field>
    <v-textarea
        v-if="list.type !== 'wedding'"
        label="Description"
        v-model="list.description"
        maxlength="4000"
        counter
        hint="This field supports markdown!"
        hide-details="auto"
    >
        <template #details>
            <RevertPrompt
                v-if="
                    previousValues.description &&
                    previousValues.description !== list.description
                "
                :previous-value="previousValues.description"
                @revert="revertValue('description')"
            />
        </template>
    </v-textarea>
    <v-select
        label="Currency"
        v-model="list.currency"
        :items="
            currencies.map((currency) => ({
                title: currency.code,
                value: currency.code,
            }))
        "
        hide-details="auto"
    >
        <template #details>
            <RevertPrompt
                v-if="
                    previousValues.currency &&
                    previousValues.currency !== list.currency
                "
                :previous-value="previousValues.currency"
                @revert="revertValue('currency')"
            />
        </template>
    </v-select>
    <v-text-field
        :label="list.type === 'wedding' ? 'Wedding URL' : 'Short URL'"
        v-model.trim="list.shortUrl"
        maxlength="32"
        counter
        @input="shortUrlChanged"
        :prefix="list.type === 'wedding' ? `${origin}/wedding/` : undefined"
        :placeholder="list.type === 'wedding' ? 'your-wedding-url' : undefined"
        :persistent-placeholder="list.type === 'wedding'"
        :hint="
            list.type === 'wedding'
                ? undefined
                : list.shortUrl
                  ? `Your short URL will be: ${origin}/${list.type === 'wedding' ? 'wedding/' : ''}${list.shortUrl}`
                  : 'Set a memorable short URL for your list'
        "
        :persistent-hint="list.type !== 'wedding'"
        hide-details="auto"
        :disabled="list.private && list.type !== 'wedding'"
        :required="list.type === 'wedding'"
    >
        <template #details>
            <RevertPrompt
                v-if="
                    previousValues.shortUrl &&
                    previousValues.shortUrl !== list.shortUrl
                "
                :previous-value="previousValues.shortUrl"
                @revert="revertValue('shortUrl')"
            />
        </template>
    </v-text-field>
    <template v-if="list.type === 'wedding' && isExisting">
        <v-text-field
            v-model="list.weddingDate"
            label="Wedding date"
            hide-details="auto"
        />
        <v-text-field
            v-model.trim="list.registryTitle"
            label="Registry title"
            maxlength="128"
            hide-details="auto"
        />
    </template>
    <template v-if="list.type === 'wedding'">
        <div class="accent-picker mt-4">
            <div class="accent-picker-title">Accent colour</div>
            <fieldset class="accent-options">
                <button
                    v-for="option in accentOptions"
                    :key="option.value"
                    type="button"
                    class="accent-option"
                    :class="{
                        selected:
                            list.accentColor?.toUpperCase() === option.value,
                    }"
                    :style="{ backgroundColor: option.value }"
                    :aria-label="option.title"
                    :aria-pressed="
                        list.accentColor?.toUpperCase() === option.value
                    "
                    @click="list.accentColor = option.value"
                />
            </fieldset>
            <label class="custom-accent">
                <span>Custom</span>
                <input
                    v-model="list.accentColor"
                    type="color"
                    aria-label="Custom accent colour"
                >
                <code>{{ list.accentColor }}</code>
            </label>
        </div>
    </template>
    <v-label v-if="list.type !== 'wedding'" class="mt-4 mb-0">
        List Privacy
    </v-label>
    <v-switch
        v-if="list.type !== 'wedding'"
        label="Private List"
        v-model="list.private"
        hint="When enabled, only you will be able to view and access this list."
        persistent-hint
        inset
        color="primary"
    />
    <v-switch
        v-if="list.type !== 'wedding'"
        label="Spoil surprises"
        v-model="list.spoilSurprises"
        hint="When enabled, you will see what items have been fulfilled and by who."
        persistent-hint
        inset
        color="primary"
    />
</template>

<script setup>
import { computed, watch } from "vue";
import RevertPrompt from "@/components/RevertPrompt.vue";
import { currencies } from "@/stores/currency";
import { WEDDING_ACCENTS } from "@/utils/weddingTheme";

const list = defineModel("list");

const origin = computed(() => window.location.origin);

const props = defineProps({
    isExisting: {
        default: false,
        type: Boolean,
    },
    previousValues: {
        default: () => ({}),
        type: Object,
    },
});

const accentOptions = WEDDING_ACCENTS;

watch(
    () => list.value?.type,
    (type) => {
        if (type === "wedding") {
            list.value.private = true;
            list.value.spoilSurprises = false;
        }
    },
    { immediate: true },
);

const shortUrlChanged = () => {
    if (list.value.shortUrl === "") {
        list.value.shortUrl = null;
        return;
    }
    list.value.shortUrl = list.value.shortUrl
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "");
};

const revertValue = (field) => {
    if (list.value && field in list.value && field in props.previousValues) {
        list.value[field] = props.previousValues[field];
    }
};
</script>

<style scoped>
.accent-options {
    border: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
    padding: 0;
}

.accent-picker-title {
    color: rgba(var(--v-theme-on-surface), 0.7);
    font-size: 0.875rem;
    font-weight: 500;
    letter-spacing: 0.01em;
}

.custom-accent {
    align-items: center;
    display: inline-flex;
    gap: 0.625rem;
    margin-top: 0.75rem;
}

.custom-accent input {
    appearance: none;
    background: transparent;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.35);
    border-radius: 0.5rem;
    cursor: pointer;
    height: 2.5rem;
    padding: 0.2rem;
    width: 2.5rem;
}

.custom-accent code {
    font-size: 0.875rem;
}

.accent-option {
    border: 2px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    height: 2.5rem;
    width: 2.5rem;
}

.accent-option.selected {
    border-color: rgb(var(--v-theme-on-surface));
    box-shadow: 0 0 0 2px rgb(var(--v-theme-surface));
}

:deep(.v-counter) {
    margin-left: 0.5rem;
}
:deep(.v-messages__message) {
    margin-top: 0.25rem;
    font-size: 1rem;
    line-height: 1.2;
}
</style>
