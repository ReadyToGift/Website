<template>
    <v-row>
        <v-col>
            <v-card
                variant="tonal"
                class="fill-height"
            >
                <v-card-title>
                    Free Membership<br/>
                    $0/year
                </v-card-title>
                <v-card-text>
                    <p>Forever Free</p>
                    <v-list>
                        <v-list-item>
                            <template #prepend>
                                <v-icon
                                    color="white"
                                    size="24"
                                >
                                    {{ mdiCheck }}
                                </v-icon>
                            </template>
                            <v-list-item-title>
                                2 public lists per year
                            </v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                            <template #prepend>
                                <v-icon
                                    color="white"
                                    size="24"
                                >
                                    {{ mdiCheck }}
                                </v-icon>
                            </template>
                            <v-list-item-title>
                                Unlimited private lists
                            </v-list-item-title>
                        </v-list-item>
                        <v-list-item>
                            <template #prepend>
                                <v-icon
                                    color="error"
                                    size="24"
                                >
                                    {{ mdiClose }}
                                </v-icon>
                            </template>
                            <v-list-item-title>
                                No autofill support
                            </v-list-item-title>
                            <v-list-item-subtitle lines="3">
                                Not as convenient, but you can still copy/paste item details.
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </v-card-text>
            </v-card>
        </v-col>
        <v-col>
            <v-card
                variant="tonal"
                color="primary"
                class="fill-height"
            >
                <v-card-title>
                    Pro Membership
                    <br/>
                    $20/year
                </v-card-title>
                <v-card-text>
                    <p>Details about the Pro Plan.</p>
                    <v-list/>
                    <v-list-item>
                        <template #prepend>
                            <v-icon
                                color="white"
                                size="24"
                            >
                                {{ mdiCheck }}
                            </v-icon>
                        </template>
                        <v-list-item-title>
                            30 public lists per year
                        </v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                        <template #prepend>
                            <v-icon
                                color="white"
                                size="24"
                            >
                                {{ mdiCheck }}
                            </v-icon>
                        </template>
                        <v-list-item-title>
                            Unlimited private lists
                        </v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                        <template #prepend>
                            <v-icon
                                color="white"
                                size="24"
                            >
                                {{ mdiCheck }}
                            </v-icon>
                        </template>
                        <v-list-item-title>
                            Autofill support
                        </v-list-item-title>
                        <v-list-item-subtitle>
                            Easily add items to your lists with autofill functionality.
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-card-text>
            </v-card>
            <v-btn
                width="100%"
                class="mt-2"
                :color="location === 'dash' ? 'primary' : 'secondary'"
                rounded="lg"
                @click="openCheckout"
                :loading="loadingCheckout"
            >
                Upgrade to Pro
            </v-btn>
        </v-col>
        <v-col>
            <v-card
                variant="tonal"
                class="fill-height"
            >
                <v-card-title>
                    Selfhosted
                </v-card-title>
                <v-card-subtitle>
                    <h3>Free Forever!</h3>
                    <p>Host Readyto.gift on your own server.</p>
                </v-card-subtitle>
            </v-card>
            <v-btn
                width="100%"
                class="mt-2"
                rounded="lg"
                :prepend-icon="mdiGithub"
                variant="tonal"
                color="surface-variant"
            >
                View on GitHub
            </v-btn>
        </v-col>
    </v-row>
</template>

<script setup>
import { mdiCheck, mdiClose, mdiGithub } from "@mdi/js";
import { defineProps, shallowRef } from "vue";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { getProCheckout } from "@/stores/polar";
import { load } from "cheerio";

const loadingCheckout = shallowRef(false);

const openCheckout = async () => {
    loadingCheckout.value = true;
    let checkout;
    try {
        const checkoutUrl = await getProCheckout();
        

        checkout = await PolarEmbedCheckout.create(checkoutUrl, authStore.userPrefs.darkMode ? "dark" : "light");
        checkout.open();
    } catch (error) {
        console.error("Error opening Polar checkout:", error);
        checkout?.close();
    } finally {
        loadingCheckout.value = false;
    }

    checkout.addEventListener("close", () => {
        console.log("Checkout closed");
    });
};

defineProps({
    location: {
        type: String
    }
});
</script>