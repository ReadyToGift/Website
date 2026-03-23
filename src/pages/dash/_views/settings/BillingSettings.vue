<template>
    <v-card
        variant="flat"
    >
        <v-card-subtitle>
            Here you can manage your subscription and billing information.
        </v-card-subtitle>
    </v-card>

    <v-card
        class="mt-4"
        variant="tonal"
    >
        <v-card-title>
            Billing Information
        </v-card-title>

        
        <table class="pricing">
            <thead>
                <th></th>
                <th>Free</th>
                <th>Pro</th>
            </thead>
            <tbody>
                <tr>
                    <td>
                        Price
                    </td>
                    <td>
                        Free forever
                    </td>
                    <td>
                        {{ proPrice }}
                    </td>
                </tr>
                <tr>
                    <td>
                        Public lists
                    </td>
                    <td>
                        2
                    </td>
                    <td>
                        Unlimited*
                    </td>
                </tr>
                <tr>
                    <td>
                        Private lists
                    </td>
                    <td>
                        Unlimited*
                    </td>
                    <td>
                        Unlimited*
                    </td>
                </tr>
                <tr>
                    <td>
                        Autofill
                    </td>
                    <td>
                        ❌
                    </td>
                    <td>
                        ✅
                    </td>
                </tr>
                <tr>
                    <td></td>
                    <td>
                        <v-btn
                            disabled
                            variant="outlined"
                        >
                            Already on free
                        </v-btn>
                    </td>
                    <td>
                        <a
                            :href="checkoutURL"
                            data-polar-checkout
                            :data-polar-checkout-theme="prefs?.darkMode ? 'dark' : 'light'"
                        >
                            <v-btn
                                :loading="proCheckoutLoading"
                            >
                                Upgrade to Pro
                            </v-btn>
                        </a>
                    </td>
                </tr>
                <tr>
                    <td
                        class="disclaimer"
                        colspan="3"
                    >
                        *Fair use
                    </td>
                </tr>
            </tbody>
        </table>
    </v-card>
</template>

<script setup>
import { onMounted, reactive, shallowRef, watch } from "vue";

import { AppwriteException } from "appwrite";
import { useStore } from "@nanostores/vue";
import { setUser, user as userStore } from "@/stores/auth";
import { getProCheckout, getProPricing, polar as polarStore } from "@/stores/polar";
import { create as createDialog } from "@/stores/dialogs";

import { VBtn, VCard, VCardText, VCardTitle, VCol, VRow } from "vuetify/components";

import { $prefs } from "@/stores/prefs";

import { account } from "@/appwrite";

const polar = useStore(polarStore);
const user = useStore(userStore);
const prefs = useStore($prefs);

const proCheckoutLoading = shallowRef(false);

const loadProPrice = async () => {
    try {
        const price = await getProPricing();

        const formattedPrice = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: price.priceCurrency
        }).format(price.priceAmount / 100);

        return formattedPrice + " / " + price.recurringInterval;
    } catch (error) {
        console.error("Failed to load Pro pricing:", error);
        return "Error fetching pricing";
    }
};

const proPrice = await loadProPrice();
const checkoutURL = shallowRef(null);

onMounted(async () => {
    proCheckoutLoading.value = true;
    checkoutURL.value = await getProCheckout();
    proCheckoutLoading.value = false;

});
</script>

<style lang="scss" scoped>
main {
    .page-content {
        width: var(--section-width);
        margin: 0 auto;
        padding: 2rem 0;

        .pricing {
            width: 100%;
            th, td {
                font-size: 1.1rem;
                padding: 0.5rem;
            }

            tbody {
                tr {
                    td {
                        text-align: center;
                        &:first-of-type {
                            text-align: right;
                            font-weight: bold;
                            width: max-content;
                        }
                        button {

                        }
                        &.disclaimer {
                            text-align: left;
                            font-size: 0.9rem;
                            font-style: italic;
                            font-weight: normal;
                        }
                    }
                }
            }
        }
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