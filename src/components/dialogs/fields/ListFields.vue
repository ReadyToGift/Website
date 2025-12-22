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
                v-if="previousValues.title && previousValues.title !== list.title"
                :previous-value="previousValues.title"
                @revert="revertValue('title')"
            />
        </template>
    </v-text-field>
    <v-textarea
        label="Description"
        v-model.trim="list.description"
        maxlength="4000"
        counter
        hint="This field supports markdown!"
        hide-details="auto"
    >
        <template #details>
            <RevertPrompt
                v-if="previousValues.description && previousValues.description !== list.description"
                :previous-value="previousValues.description"
                @revert="revertValue('description')"
            />
        </template>
    </v-textarea>
    <v-select
        label="Currency"
        v-model="list.currency"
        :items="
            currencies.get().map((currency) => ({
                title: currency.code,
                value: currency.code
            }))
        "
        hide-details="auto"
    >
        <template #details>
            <RevertPrompt
                v-if="previousValues.currency && previousValues.currency !== list.currency"
                :previous-value="previousValues.currency"
                @revert="revertValue('currency')"
            />
        </template>
    </v-select>
    <v-text-field
        label="Short URL"
        v-model.trim="list.shortUrl"
        maxlength="32"
        counter
        persistent-hint
        @input="shortUrlChanged"
        :hint="
            list.shortUrl ? `Your short URL will be: ${origin}/${list.shortUrl}` : `Set a memorable short URL for your list`
        "
        hide-details="auto"
        :disabled="list.private"
    >
        <template #details>
            <RevertPrompt
                v-if="previousValues.shortUrl && previousValues.shortUrl !== list.shortUrl"
                :previous-value="previousValues.shortUrl"
                @revert="revertValue('shortUrl')"
            />
        </template>
    </v-text-field>
    <v-label class="mt-4 mb-0">List Privacy</v-label>
    <v-switch
        label="Private List"
        v-model="list.private"
        hint="When enabled, only you will be able to view and access this list."
        persistent-hint
        inset
        color="primary"
    />
</template>

<script setup>
import { VLabel, VSelect, VSwitch, VTextarea, VTextField } from "vuetify/components";
import { computed } from "vue";
import { currencies } from "@/stores/currency";
import RevertPrompt from "@/components/RevertPrompt.vue";

const list = defineModel("list");

const origin = computed(() => window.location.origin);

const props = defineProps({
    previousValues: {
        default: () => ({}),
        type: Object
    }
});

const shortUrlChanged = () => {
    if (list.value.shortUrl === "") return list.value.shortUrl = null;
    list.value.shortUrl = list.value.shortUrl.toLowerCase().replace(/[^a-z0-9-_]/g, "");
};

const revertValue = (field) => {
    if (list.value && field in list.value && field in props.previousValues) {
        list.value[field] = props.previousValues[field];
    }
};
</script>

<style scoped>
:deep(.v-counter) {
    margin-left: 0.5rem;
}
:deep(.v-messages__message) {
    margin-top: 0.25rem;
    font-size: 1rem;
    line-height: 1.2;
}
</style>