<template>
    <p
        @click="$emit('revert')"
        class="d-flex ga-4 align-center font-weight-bold text-surface-variant cursor-pointer"
    >
        <v-icon
            size="x-small"
            color="primary"
        >
            {{ mdiUndoVariant }}
        </v-icon>
        <span>
            Revert to <span class="text-primary">{{ previousValue }}</span>
        </span>
    </p>
</template>

<script setup>
import { mdiUndoVariant } from "@mdi/js";

defineProps({
    previousValue: {
        required: true,
        type: [String, Number, Object, Array]
    }
});
</script>