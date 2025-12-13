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
import { client, databases, functions } from "@/appwrite";
import { computed, onMounted, onUnmounted, shallowRef } from "vue";
import { mdiCheck, mdiFileDocument, mdiFileDocumentCheck, mdiImage, mdiImageCheck, mdiLoading, mdiWeb, mdiWebCheck } from "@mdi/js";
import { APPWRITE_DB } from "astro:env/client";

const totalAttempts = shallowRef(0);
const currentAttempt = shallowRef(0);
const attemptStatus = shallowRef("");
const outputData = shallowRef(null);
const status = shallowRef("");

const autofillSubscription = shallowRef(null);

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
        const result = await functions.createExecution(
            "get-autofill-data",
            JSON.stringify({
                currency: props.currency,
                itemID: props.itemID,
                url: props.url
            }),
            true
        );

        const executionID = result.$id;

        if (result.status !== "failed") {
            // Fall back to manual polling incase socket fails, or completes before socket connects
            pollingFallback = setInterval(async () => {
                try {
                    const pollResult = await databases.getDocument(
                        APPWRITE_DB,
                        "autofills",
                        executionID
                    );

                    switch (pollResult.status) {
                    case "failed":
                        clearInterval(pollingFallback);
                        emit("error", "All autofill attempts have failed. Please try again later or fill in the details manually.");
                        break;
                    case "completed":
                        clearInterval(pollingFallback);
                        setTimeout(() => {
                            emit("complete", pollResult.outputData);
                        }, 500);
                        break;
                    }
                } catch (err) {
                    if (err.message === "AppwriteException: Document with the requested ID could not be found.") throw err;
                }
            }, 5000);

            autofillSubscription.value = client.subscribe([
                "executions",
                `databases.wishlist.collections.autofills.documents.${executionID}` // try without, then with just
            ], (response) => {
                clearInterval(pollingFallback); // Clear the recheck timeout on receiving an update
                if (response.channels.includes("rows")) {

                    currentAttempt.value = response.payload.attempt;
                    totalAttempts.value = response.payload.totalAttempts;
                    attemptStatus.value = response.payload.attemptStatus;
                    outputData.value = response.payload.outputData;
                    status.value = response.payload.status;

                    if (status.value === "failed") {
                        emit("error", "All autofill attempts have failed. Please try again later or fill in the details manually.");
                    }

                    if (status.value === "completed") {
                        autofillSubscription.value(); // Unsubscribe from the subscription
                        setTimeout(() => {
                            emit("complete", outputData.value);
                        }, 500);
                    }
                } else if (response.channels.includes("executions")) {
                    if (response.payload.status === "completed") {
                        // Just in case the DB update is delayed
                        setTimeout(() => {
                            emit("complete", outputData.value);
                        }, 500);
                    } else {
                        if (response.payload.status === "failed") {
                            emit("error", "All autofill attempts have failed. Please try again later or fill in the details manually.");
                        }
                    }
                }
            });
        } else {
            throw new Error("Autofill function execution failed to start.");
        }
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
