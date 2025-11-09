<template>
    <v-container>
        <v-card>
            <v-card-title>
                Account Settings
            </v-card-title>
            <v-card-text>
                <p>This is a placeholder for the Account Settings page.</p>
                <p>Here you will be able to manage your account details, change your password, and configure other
                    settings related to your profile.</p>
            </v-card-text>
        </v-card>
        <v-btn @click="polarStore.getProCheckout">
            Upgrade to Pro
        </v-btn>
        <PricingCards location="dash" />
    </v-container>
</template>

<script setup>
import PricingCards from "@/components/PricingCards.vue";
import { usePolarStore } from "@/stores/polar";

const polarStore = usePolarStore();
</script>