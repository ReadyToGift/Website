<template>
    {{ dialogs.dialogs }}
    <v-dialog
        v-for="dialog in dialogs.dialogs"
        :key="dialog.id"
        v-model="dialog.open"
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
                    :to="action.to"
                >
                    {{ action.text }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>


<script setup>
import { computed } from "vue";
import { useDialogs } from "@/stores/dialogs";

const dialogs = useDialogs();

const dialogEmits = computed(() => {
    return Object.fromEntries(
        dialogs.dialogs.map((dialog) => {
            if (!dialog.emits) return [dialog.id, {}];

            const emits = {};
            for (const emit of dialog.emits) {
                emits[emit] = (emitData) => {
                    dialogs.close(dialog.id, emit, emitData);
                };
            }

            return [dialog.id, emits];
        })
    );
});

const handleAfterLeave = (id) => {
    dialogs.close(id, "closed");
};

const actionHandler = (action, id) => {
    if (typeof action.action === "function") {
        action.action();
    }

    if (action.action === "close" || action.closeAfterAction) {
        dialogs.close(id, action.text);
    }
};

</script>
