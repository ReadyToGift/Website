<template>
    <v-list-item
        title="Multi-Factor Authentication (TOTP)"
        :prepend-icon="mdiShieldCheck"
        class="mfa-item"
    >
        <template #append>
            <TOTPFactor :loading="loadingMFAFactors" />
        </template>
    </v-list-item>
</template>

<script setup>
import { mdiShieldCheck } from "@mdi/js";
import { onMounted, shallowRef } from "vue";
import { getMFAFactors } from "@/stores/auth";
import TOTPFactor from "./factors/totp/TOTP.vue";

const loadingMFAFactors = shallowRef(true);

onMounted(async () => {
    await getMFAFactors();
    loadingMFAFactors.value = false;
});
</script>

<style lang="scss" scoped>
.mfa {
    > .v-card-item > .v-card-item__content {
        > .v-card-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }
    }
}

.v-list-item.mfa-item {
    align-items: flex-start;
}

.totp-factor-controls,
.totp-factor-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.enable-mfa {
    display: flex;
}

.totp-qrcode {
    width: min(16rem, 100%);
    height: auto;
    aspect-ratio: 1;
    display: block;
    object-fit: contain;
    border-radius: 1rem;
    background-color: white;
    padding: 0.7rem;
}

.totp-secret {
    width: 100%;
}

.totp-secret input {
    min-width: 0;
    font-size: 0.875rem;
}
</style>
