<template>
    <v-dialog
        v-for="dialog in Object.values(dialogs || {})"
        :key="dialog.id"
        :model-value="dialog.open"
        @update:model-value="(value) => !value && closeDialog(dialog.id, 'closed')"
        :max-width="dialog.maxWidth || (
            $vuetify.display.mobile ? '100%' : '500px')"
        :fullscreen="dialog.fullscreen !== undefined ? dialog.fullscreen : $vuetify.display.mobile ? true : false"
        :persistent="dialog.persistent"
        :scrim="dialog.opaque ? 'rgb(var(--v-theme-background))' : true"
        :opacity="dialog.opaque ? 1 : undefined"
        @after-leave="handleAfterLeave(dialog.id)"
    >
        <v-card :title="dialog.title">
            <v-card-text v-if="dialog.text">
                {{ dialog.text }}
            </v-card-text>
            <component
                :is="dialog.component"
                v-bind="dialog.props"
                v-if="dialog.component"
                v-on="dialogEmits[dialog.id]"
            />
            <v-card-actions v-if="dialog.actions">
                <v-btn
                    v-for="action in dialog.actions"
                    :key="action.text"
                    @click="actionHandler(action, dialog.id)"
                    :color="action.color || 'primary'"
                    :variant="action.variant || 'text'"
                    :href="action.href"
                >
                    {{ action.text }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>


<script setup>
import { close as closeDialog, dialogs as dialogsStore } from "@/stores/dialogs";
import { computed } from "vue";
import { useStore } from "@nanostores/vue";

const dialogs = useStore(dialogsStore);

const dialogEmits = computed(() => {
    const dialogsValue = Object.values(dialogs.value || {});
    return Object.fromEntries(
        dialogsValue.map((dialog) => {
            if (!dialog.emits) return [dialog.id, {}];

            const emits = {};
            for (const emit of dialog.emits) {
                emits[emit] = (emitData) => {
                    closeDialog(dialog.id, emit, emitData);
                };
            }

            return [dialog.id, emits];
        })
    );
});

const handleAfterLeave = (id) => {
    closeDialog(id, "closed");
};

const actionHandler = (action, id) => {
    if (typeof action.action === "function") {
        action.action();
    }

    if (action.action === "close" || action.closeAfterAction) {
        closeDialog(id, action.text);
    }
};

</script>
