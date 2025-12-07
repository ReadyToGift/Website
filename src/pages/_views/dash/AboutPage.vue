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
                        <strong>Version:</strong> {{ versionStore.loadCommit || 'Unknown' }}
                    </v-list-item>
                    <v-list-item :prepend-icon="mdiCalendarClock">
                        <strong>Build Date:</strong> {{ versionStore.loadBuildDate || 'Unknown' }}
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import { mdiCalendarClock, mdiInformationOutline } from "@mdi/js";
import { useVersion } from "@/stores/version";
const versionStore = useVersion();
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