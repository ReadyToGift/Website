<template>
    <v-timeline-item
        :icon="icon"
        :icon-color="completed || active ? 'surface' : 'on-surface'"
        :dot-color="completed || active ? 'primary' : 'surface'"
        :fill-dot="completed || active"
        :data-completed="completed"
        :data-active="active"
        :data-step="step"
    >
        <v-expansion-panels :model-value="currentStep">
            <v-expansion-panel
                elevation="0"
                static
                readonly
                hide-actions
                :value="step"
            >
                <v-expansion-panel-title
                    class="px-0 py-2"
                    min-height="max-content"
                >
                    <h3>
                        <slot name="title"></slot>
                    </h3>
                </v-expansion-panel-title>
                <v-expansion-panel-text class="pa-0 ma-0">
                    <slot name="content"></slot>
                    <v-alert
                        v-if="error"
                        class="mt-4"
                        type="error"
                        border="start"
                        dense
                    >
                        {{ error }}
                    </v-alert>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </v-timeline-item>
</template>

<script setup>
import { computed } from "vue";
import { mdiNumeric1 } from "@mdi/js";

const props = defineProps({
    currentStep: {
        required: true,
        type: Number
    },
    error: {
        required: false,
        type: String
    },
    icon: {
        default: () => mdiNumeric1,
        type: String
    },
    step: {
        required: true,
        type: Number
    }
});

const completed = computed(() => props.currentStep > props.step);
const active = computed(() => props.currentStep === props.step);
</script>

<style lang="scss" scoped>
.v-expansion-panel-title {
    cursor: text;
}
.v-expansion-panel-title__overlay  {
    display: none;
}
.v-expansion-panel-text__wrapper {
    padding: 0 !important;
}

:deep(.v-timeline) {
    .v-timeline-item[data-completed="true"] .v-timeline-divider__after,
    .v-timeline-item[data-completed="true"] .v-timeline-divider__before,
    .v-timeline-item[data-active="true"] .v-timeline-divider__before {
        background-color: rgb(var(--v-theme-primary)) !important;
    }
}

</style>
