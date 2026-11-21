<template>
    <v-footer class="mb-4 v-card--variant-tonal pa-0">
        <div class="made-by">Readyto.gift</div>
        <div class="footer-links">
            <v-btn
                to="/legal/privacy"
                text="Privacy"
                slim
                variant="text"
                density="compact"
            />
            <v-btn
                to="/legal/terms"
                text="Terms"
                slim
                variant="text"
                density="compact"
            />
        </div>
    </v-footer>
</template>

<script setup>
import { mdiGithub } from "@mdi/js";
</script>

<style lang="scss" scoped>
.v-footer {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: space-between;
    width: var(--section-width);
    margin: 0 auto;
    .made-by {
        a {
            background-color: transparent;
            color: rgb(var(--v-theme-primary));
            text-decoration: underline;
        }
    }
    .footer-links {
        display: flex;
        align-items: center;
    }
}
</style>
