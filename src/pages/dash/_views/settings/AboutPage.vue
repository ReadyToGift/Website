<template>
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
                    <strong>Version:</strong> {{ loadCommit.get() || 'Unknown' }}
                </v-list-item>
                <v-list-item :prepend-icon="mdiCalendarClock">
                    <strong>Build Date:</strong> {{ loadBuildDate.get() || 'Unknown' }}
                </v-list-item>
            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { loadBuildDate, loadCommit } from "@/stores/version";
import { mdiCalendarClock, mdiInformationOutline } from "@mdi/js";
import { VCard, VCardText, VCardTitle, VList, VListItem } from "vuetify/components";
</script>