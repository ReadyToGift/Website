<template>
    <v-dialog
        v-model="dialogOpen"
        :max-width="$vuetify.display.mobile ? '100%' : '500px'"
    >
        <template #activator="{ props: activatorProps }">
            <v-btn
                v-bind="activatorProps"
                :icon="label ? undefined : mdiFlagOutline"
                :prepend-icon="label ? mdiFlagOutline : undefined"
                :title="`Report ${targetType}`"
                color="error"
                :size="label ? 'small' : undefined"
                :text="label || undefined"
                :variant="variant"
                @click.stop
            />
        </template>

        <template v-if="submitted">
            <div class="report-confirmation">
                <v-alert type="success" :icon="mdiCheckCircle" color="primary">
                    Thanks for letting us know. We’ll review this report as soon
                    as we can.
                </v-alert>
                <div class="report-dialog-actions">
                    <v-btn text="Close" @click="close" />
                </div>
            </div>
        </template>
        <template v-else>
            <v-card :title="`Report ${targetType}`">
                <v-card-text>
                    <p class="mb-4">What’s wrong with this {{ targetType }}?</p>
                    <v-radio-group v-model="reason" hide-details="auto">
                        <v-radio
                            v-for="option in reasons"
                            :key="option"
                            :label="option"
                            :value="option"
                        />
                    </v-radio-group>
                    <v-textarea
                        v-model="details"
                        label="Additional details (optional)"
                        rows="3"
                        maxlength="1000"
                        counter
                        class="mt-2"
                        :error-messages="error"
                    />
                </v-card-text>
                <v-card-actions>
                    <v-btn text="Close" @click="close" />
                    <v-btn
                        color="primary"
                        text="Send report"
                        variant="elevated"
                        :loading="loading"
                        :disabled="!reason"
                        @click="submit"
                    />
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script>
import { mdiCheckCircle, mdiFlagOutline } from "@mdi/js";
import {
    VAlert,
    VBtn,
    VCard,
    VCardActions,
    VCardText,
    VDialog,
    VRadio,
    VRadioGroup,
    VTextarea,
} from "vuetify/components";

export default {
    components: {
        VAlert,
        VBtn,
        VCard,
        VCardActions,
        VCardText,
        VDialog,
        VRadio,
        VRadioGroup,
        VTextarea,
    },
    props: {
        item: {
            type: Object,
            default: null,
        },
        label: {
            type: String,
            default: "",
        },
        list: {
            type: Object,
            required: true,
        },
        targetType: {
            type: String,
            default: "item",
        },
        variant: {
            type: String,
            default: "text",
        },
    },
    data() {
        return {
            dialogOpen: false,
            details: "",
            error: "",
            loading: false,
            mdiCheckCircle,
            mdiFlagOutline,
            reason: "",
            reasons: [
                "Spam or advertising",
                "Inappropriate or offensive content",
                "Misleading or unsafe link",
                "Copyright or privacy concern",
                "Something else",
            ],
            submitted: false,
        };
    },
    methods: {
        close() {
            this.dialogOpen = false;
            setTimeout(() => {
                this.reason = "";
                this.details = "";
                this.error = "";
                this.submitted = false;
            }, 200);
        },
        async submit() {
            this.loading = true;
            this.error = "";
            try {
                const response = await fetch("/api/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        details: this.details,
                        itemId: this.item?.id,
                        listId: this.list.id,
                        reason: this.reason,
                    }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                this.submitted = true;
            } catch (e) {
                this.error =
                    e.message || "Unable to send the report. Please try again.";
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.report-confirmation {
    background: rgb(var(--v-theme-surface));
    border-radius: 1rem;
    padding: 1.5rem;

    .report-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
    }
}
</style>
