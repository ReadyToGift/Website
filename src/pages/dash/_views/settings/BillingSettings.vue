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
        <table class="pricing">
            <thead>
                <tr>
                    <th></th>
                    <th>Free</th>
                    <th>Pro</th>
                </tr>
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
                            v-if="!polar.pro"
                        >
                            Already on free
                        </v-btn>
                        <v-btn v-else>
                            Downgrade
                        </v-btn>
                    </td>
                    <td>
                        <v-btn
                            :loading="proCheckoutLoading"
                            @click="proCheckout"
                            v-if="!polar.pro"
                        >
                            Upgrade to Pro
                        </v-btn>
                        <v-btn
                            disabled
                            variant="outlined"
                            v-else
                        >
                            Already on pro
                        </v-btn>
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
    <v-card
        class="mt-4"
        variant="tonal"
    > 
        <v-card-title>
            Manage your subscription
        </v-card-title>
        <v-card-text>
            <h2>
                {{ polar.pro.name }}
            </h2>
            <p>
                Renews on {{ new Date(polar.pro.currentPeriodEnd) }} for {{ formatPrice(polar.pro.amount, polar.pro.currency) }}/{{ polar.pro.recurringInterval }}.
                <span
                    class="originalPrice"
                    v-if="polar.pro.product.prices && polar.pro.product.prices[0].priceAmount > polar.pro.amount"
                >
                    {{ formatPrice(polar.pro.product.prices[0].priceAmount, polar.pro.product.prices[0].priceCurrency) }}
                </span>
            </p>
        </v-card-text>
        {{ polar.pro }}
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

const formatPrice = (price, currency) => {
    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0
    }).format(price / 100);

    return formattedPrice;
};

const loadProPrice = async () => {
    try {
        const price = await getProPricing();

        const formattedPrice = formatPrice(price.priceAmount, price.priceCurrency);

        return formattedPrice + "/" + price.recurringInterval;
    } catch (error) {
        console.error("Failed to load Pro pricing:", error);
        return "Error fetching pricing";
    }
};

const proPrice = await loadProPrice();

const proCheckout = async () => {
    proCheckoutLoading.value = true;
    try {
        const checkoutURL = await getProCheckout();
        window.location.href = checkoutURL;
    } catch (error) {
        proCheckoutLoading.value = false;
        console.error(error);

        createDialog({
            title: "Error getting checkout",
            text: "Please try again later",
            actions: [
                {
                    action: "close",
                    color: "primary",
                    text: "OK"
                }
            ]
        });
    }
};
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

            thead {
                th {
                    font-size: 1.5rem;
                }
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