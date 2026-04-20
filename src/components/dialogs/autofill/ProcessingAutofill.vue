<template>
    <v-card-title>
        Processing Autofill
        <v-chip
            rounded="pill"
            color="primary"
            v-if="totalAttempts > 0"
            class="ml-4"
        >
            Attempt {{ currentAttempt }} of {{ totalAttempts }}
        </v-chip>
    </v-card-title>
    <v-card-text>
        <v-timeline
            :direction="$vuetify.display.mobile ? 'vertical' : 'horizontal'"
            truncate-line="both"
            side="end"
            align="center"
        >
            <v-timeline-item
                v-for="(step, index) in timelineSteps"
                :key="index"
                :dot-color="
                    index > currentStep ? 'transparent' : 'primary'
                "
                :fill-dot="index <= currentStep"
                :data-completed="index < currentStep"
                :data-active="index === currentStep"
            >
                <template #icon>
                    <v-icon
                        :icon="step.icon"
                        color="primary"
                        v-if="index > currentStep"
                    />
                    <v-icon
                        :icon="mdiLoading"
                        color="white"
                        class="v-icon--spin"
                        v-else-if="index === currentStep"
                    />
                    <v-icon
                        :icon="step.completeIcon || step.icon"
                        color="white"
                        v-else
                    />
                </template>
                <div :class="$vuetify.display.mobile ? '' : 'text-center'">
                    <div class="text-h6">{{ step.label }}</div>
                </div>
            </v-timeline-item>
        </v-timeline>
    </v-card-text>
</template>


<script setup>
import { computed, onMounted, onUnmounted, shallowRef } from "vue";
import { mdiCheck, mdiFileDocument, mdiFileDocumentCheck, mdiImage, mdiImageCheck, mdiLoading, mdiWeb, mdiWebCheck } from "@mdi/js";
import { VCardText, VCardTitle, VChip, VIcon, VTimeline, VTimelineItem } from "vuetify/components";
import { getJwt } from "@/stores/auth";
import { setUsedAutofillAllowance } from "@/stores/billing";
import { SSE } from "sse.js";

const totalAttempts = shallowRef(0);
const currentAttempt = shallowRef(0);
const attemptStatus = shallowRef("");
const outputData = shallowRef(null);
const status = shallowRef("");
const completed = shallowRef(false);

const autofillSubscription = shallowRef(null);
const autofillSSE = shallowRef(null);

const currentStep = computed(() => {
    if (attemptStatus.value) {
        switch (attemptStatus.value) {
        case "starting":
            return 0;
        case "processing":
            return 1;
        case "finding-best-image":
        case "processing-best-image":
            return 2;
        case "completed":
            return 4;
        }
    }
    return 0;
});

const timelineSteps = [
    {
        completeIcon: mdiWebCheck,
        icon: mdiWeb,
        label: "Fetching page data"
    },
    {
        completeIcon: mdiFileDocumentCheck,
        icon: mdiFileDocument,
        label: "Processing page data"
    },
    {
        completeIcon: mdiImageCheck,
        icon: mdiImage,
        label: "Finding images"
    },
    {
        icon: mdiCheck,
        label: "Finishing up"
    }
];

const props = defineProps({
    currency: {
        required: true,
        type: String
    },
    itemID: {
        required: true,
        type: String
    },
    url: {
        required: true,
        type: String
    }
});

let pollingFallback = null;

const emit = defineEmits(["complete", "error"]);

const autofill = async () => {
    try {
        pollingFallback = null;

        const jwt = await getJwt();

        if (!jwt) {
            throw new Error("User is not authenticated.");
        }

        let sseClient;

        try {
            sseClient = new SSE("/api/content/item/autofill", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwt}`
                },
                payload: JSON.stringify({
                    itemID: props.itemID,
                    url: props.url,
                    currency: props.currency
                })
            });
        } catch (err) {
            console.error("Failed to create SSE client:", err);
            throw new Error("Failed to start autofill process. Please try again.");
        }

        autofillSSE.value = sseClient;

        sseClient.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                console.log("Autofill SSE:", payload);

                currentAttempt.value = payload.attempt || 0;
                totalAttempts.value = payload.totalAttempts || 0;
                attemptStatus.value = payload.attemptStatus || payload.status || "";
                status.value = payload.status || "";

                if (payload.outputData) {
                    outputData.value = payload.outputData;
                }

                if (payload.status === "completed" && payload.outputData) {
                    completed.value = true;
                    console.log(payload.outputData);
                    if (payload.newConsumedUnits) setUsedAutofillAllowance(payload.newConsumedUnits);
                    emit("complete", JSON.stringify(payload.outputData));
                    sseClient.close();
                }
            } catch (parseError) {
                console.error("Failed to parse SSE message:", parseError, event.data);
            }
        };

        sseClient.onerror = (event) => {
            if (completed.value) {
                return;
            }
            console.error("SSE Error:", event);

            if (event.data) {
                try {
                    const errorPayload = JSON.parse(event.data);
                    console.error("Autofill SSE Error Payload:", errorPayload);
                    if (errorPayload.message) {
                        emit("error", `Autofill error: ${errorPayload.message}`);
                    } else {
                        emit("error", "An unknown error occurred during autofill.");
                    }
                } catch (parseError) {
                    console.error("Failed to parse SSE error message:", parseError, event.data);
                    emit("error", "An error occurred during autofill, and the error message could not be parsed.");
                }
            } else {
                emit("error", "An error occurred during autofill, and no additional information is available.");
            }
            sseClient.close();
        };
    } catch (error) {
        console.error({
            error
        });
        emit("error", "All autofill attempts have failed. Please try again later or fill in the details manually.");
    }
};

onMounted(() => {
    autofill();
});

onUnmounted(() => {
    if (autofillSubscription.value) {
        autofillSubscription.value(); // Unsubscribe from the subscription
    }
    if (autofillSSE.value) {
        autofillSSE.value.close();
        autofillSSE.value = null;
    }
    if (pollingFallback) {
        clearInterval(pollingFallback);
    }
});

</script>


<style lang="scss" scoped>
.v-icon--spin {
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

:deep(.v-timeline) {
    .v-timeline-item[data-completed="true"] .v-timeline-divider__after,
    .v-timeline-item[data-completed="true"] .v-timeline-divider__before,
    .v-timeline-item[data-active="true"] .v-timeline-divider__before {
        background-color: rgb(var(--v-theme-primary)) !important;
    }
}

</style>
