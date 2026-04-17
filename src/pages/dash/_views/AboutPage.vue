<template>
    <div class="page-content">
        <v-card
            variant="tonal"
            color="secondary"
        >
            <v-card-title>
                About Readyto.gift
            </v-card-title>
            <v-card-text>
                <v-list>
                    <v-list-item :prepend-icon="mdiInformationOutline">
                        <strong>Version:</strong> {{ loadCommit.value || 'Unknown' }}
                    </v-list-item>
                    <v-list-item :prepend-icon="mdiCalendarClock">
                        <strong>Build Date:</strong> {{ loadBuildDate.value || 'Unknown' }}
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { mdiCalendarClock, mdiInformationOutline } from "@mdi/js";
import { loadBuildDate, loadCommit } from "@/stores/version";
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
    }
}
</style>