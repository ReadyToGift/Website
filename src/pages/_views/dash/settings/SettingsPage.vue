<template>
    <div class="page-content">
        <v-sheet
            elevation="0"
        >
            <v-tabs
                color="primary"
                v-model="tab"
            >
                <v-tab
                    value="account"
                    to="/dash/settings/account"
                >
                    Account
                </v-tab>
                <v-tab
                    value="billing"
                    to="/dash/settings/billing"
                >
                    Billing
                </v-tab>
            </v-tabs>
            <v-tabs-window v-model="tab">
                <v-tabs-window-item
                    value="account"
                    class="pt-4"
                >
                    <AccountSettings />
                </v-tabs-window-item>
                <v-tabs-window-item
                    value="billing"
                    class="pt-4"
                >
                    <BillingSettings />
                </v-tabs-window-item>
            </v-tabs-window>
        </v-sheet>
    </div>
</template>

<script setup>
import AccountSettings from "./AccountSettings.vue";
import BillingSettings from "./BillingSettings.vue";
import { shallowRef } from "vue";

const tab = shallowRef("account");
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;
    }

    .v-list {
        max-width: 100%;
        width: max-content;
    }

    @media screen and (max-width: 768px) {
        .v-list {
            width: 100%;
        }
    }
}
</style>