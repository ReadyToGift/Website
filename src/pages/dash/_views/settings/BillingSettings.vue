<template>
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
                        <v-chip rounded="pill">
                            Free forever
                        </v-chip>
                    </td>
                    <td>
                        <v-chip
                            rounded="pill" 
                            color="primary"
                        >
                            <template
                                v-slot:prepend
                                v-if="proPriceLoading"
                            >
                                <v-progress-circular
                                    indeterminate
                                    size="20"
                                    width="2"
                                    class="mr-2"
                                />
                            </template>
                            <template
                                v-if="proPriceLoading"
                            >
                                Loading
                            </template>
                            <template v-else>
                                {{ proPrice }}
                            </template>
                        </v-chip>
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
                        20
                    </td>
                </tr>
                <tr>
                    <td>
                        Private lists
                    </td>
                    <td>
                        10
                    </td>
                    <td>
                        50
                    </td>
                </tr>
                <tr>
                    <td>
                        Items per list
                    </td>
                    <td>
                        50
                    </td>
                    <td>
                        150
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
                            :loading="proCheckoutLoading || proPriceLoading"
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
                        Please contact support if you had any questions, or if you require higher limits than those listed here.
                    </td>
                </tr>
            </tbody>
        </table>
    </v-card>
    <v-card
        class="mt-4 subscription-details"
        variant="tonal"
        v-if="polar.pro || polar.inactiveSubscription"
    > 
        <v-card-title>
            Manage {{ polar.pro ? polar.pro.product.name : polar.inactiveSubscription.product.name }}
        </v-card-title>
        <v-card-subtitle>
            <template v-if="polar.pro && polar.pro.status === 'active'">
                <template v-if="polar.pro.cancelAtPeriodEnd">
                    Cancels on {{ formatDate(polar.pro.currentPeriodEnd) }}
                </template>
                <template v-else>
                    Renews on {{ formatDate(polar.pro.currentPeriodEnd) }} for
                    <v-chip
                        rounded="pill"
                        size="small"
                    >{{ formatPrice(polar.pro.amount, polar.pro.currency) }}/{{ polar.pro.recurringInterval }}
                        <span
                            class="originalPrice"
                            v-if="polar.pro.product.prices && polar.pro.product.prices[0].priceAmount > polar.pro.amount"
                        >
                            {{ formatPrice(polar.pro.product.prices[0].priceAmount, polar.pro.product.prices[0].priceCurrency) }}/{{ polar.pro.product.prices[0].recurringInterval }}
                        </span>
                    </v-chip>
                </template>
            </template>
            <template v-else-if="polar.inactiveSubscription">
                Ended on {{ formatDate(polar.inactiveSubscription.endedAt) }}.
            </template>
        </v-card-subtitle>
        <v-card-text>
            <v-btn
                :href="polar.session.customerPortalUrl"
                target="_blank"
            >
                Open billing portal
            </v-btn>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { onMounted, shallowRef } from "vue";

import { getProCheckout, getProPricing, polar as polarStore } from "@/stores/polar";
import { create as createDialog } from "@/stores/dialogs";
import { useStore } from "@nanostores/vue";

import { VBtn, VCard, VCardSubtitle, VCardText, VCardTitle, VChip, VProgressCircular } from "vuetify/components";


const polar = useStore(polarStore);

const proCheckoutLoading = shallowRef(false);
const proPriceLoading = shallowRef(false);
const proPrice = shallowRef("");

const formatPrice = (price, currency) => {
    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0
    }).format(price / 100);

    return formattedPrice;
};

const loadProPrice = async () => {
    proPriceLoading.value = true;
    try {
        const price = await getProPricing();

        const formattedPrice = formatPrice(price.priceAmount, price.priceCurrency);

        proPriceLoading.value = false;
        proPrice.value = formattedPrice + "/" + price.recurringInterval;
        return proPrice.value;
    } catch (error) {
        console.error("Failed to load Pro pricing:", error);
        proPriceLoading.value = false;
        return "Error fetching pricing";
    }
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
};

onMounted(() => {
    loadProPrice();
});

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
    .subscription-details {
        .originalPrice {
            text-decoration: line-through;
            opacity: 0.7;
            margin-left: 0.5rem;
        }
    }

    @media screen and (max-width: 768px) {
        .v-list {
            width: 100%;
        }
    }
}
</style>