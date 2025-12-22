<template>
    <v-dialog
        v-model="dialog"
        max-width="500px"
    >
        <v-card>
            <v-card-title>Multi-Factor Authentication</v-card-title>
            <v-card-text> Please enter the code from your authenticator app. </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    color="primary"
                    text
                    @click="submit"
                > Submit </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { VBtn, VCard, VCardActions, VCardText, VCardTitle, VDialog, VSpacer } from "vuetify/components";
import { shallowRef } from "vue";

const dialog = shallowRef(false);
</script>
