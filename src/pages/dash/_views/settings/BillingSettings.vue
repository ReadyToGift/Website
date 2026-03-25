<template>
    <v-card
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
                                v-if="proLoading"
                            >
                                <v-progress-circular
                                    indeterminate
                                    size="20"
                                    width="2"
                                    class="mr-2"
                                />
                            </template>
                            <template
                                v-if="proLoading"
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
                        <p class="value">
                            2
                        </p>
                        <p class="name">
                            Public Lists
                        </p>
                    </td>
                    <td>
                        <p class="value">
                            <template v-if="proPublicListLimit === null">
                                <v-progress-circular
                                    indeterminate
                                    size="20"
                                    width="2"
                                />
                            </template>
                            <template v-else>
                                {{ proPublicListLimit }}
                            </template>
                        </p>
                        <p class="name">
                            Public Lists
                        </p>
                    </td>
                </tr>
                <tr>
                    <td>
                        Private lists
                    </td>
                    <td>
                        <p class="value">
                            10
                        </p>
                        <p class="name">
                            Private Lists
                        </p>
                    </td>
                    <td>
                        <p class="value">
                            <template v-if="proPrivateListLimit === null">
                                <v-progress-circular
                                    indeterminate
                                    size="20"
                                    width="2"
                                />
                            </template>
                            <template v-else>
                                {{ proPrivateListLimit }}
                            </template>
                        </p>
                        <p class="name">
                            Private Lists
                        </p>
                    </td>
                </tr>
                <tr>
                    <td>
                        Items per list
                    </td>
                    <td>
                        <p class="value">
                            50
                        </p>
                        <p class="name">
                            Items per list
                        </p>
                    </td>
                    <td>
                        <p class="value">
                            <template v-if="proItemsPerListLimit === null">
                                <v-progress-circular
                                    indeterminate
                                    size="20"
                                    width="2"
                                />
                            </template>
                            <template v-else>
                                {{ proItemsPerListLimit }}
                            </template>
                        </p>
                        <p class="name">
                            Items per list
                        </p>
                    </td>
                </tr>
                <tr>
                    <td>
                        Autofill
                    </td>
                    <td>
                        <p class="value">
                            ❌
                        </p>
                        <p class="name">
                            Autofill
                        </p>
                    </td>
                    <td>
                        <p class="value">
                            ✅
                        </p>
                        <p class="name">
                            Autofill
                        </p>
                    </td>
                </tr>
                <tr class="buttons">
                    <td></td>
                    <td>
                        <v-btn
                            disabled
                            variant="outlined"
                            v-if="!billing.pro"
                        >
                            Already on free
                        </v-btn>
                        <v-btn v-else>
                            Downgrade
                        </v-btn>
                    </td>
                    <td>
                        <v-btn
                            :loading="proCheckoutLoading || proLoading"
                            @click="proCheckout"
                            v-if="!billing.pro"
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
                        <p>
                            Please contact support if you have any questions, or if you require higher limits than those listed here.
                        </p>
                    </td>
                </tr>
            </tbody>
        </table>
    </v-card>
    <v-card
        class="mt-4 subscription-details"
        variant="tonal"
        v-if="billing.pro || billing.inactiveSubscription"
    > 
        <v-card-title>
            Manage {{ billing.pro ? billing.pro.product.name : billing.inactiveSubscription.product.name }}
        </v-card-title>
        <v-card-subtitle>
            <template v-if="billing.pro && billing.pro.status === 'active'">
                <template v-if="billing.pro.cancelAtPeriodEnd">
                    Cancels on {{ formatDate(billing.pro.currentPeriodEnd) }}
                </template>
                <template v-else>
                    Renews on {{ formatDate(billing.pro.currentPeriodEnd) }} for
                    <v-chip
                        rounded="pill"
                        size="small"
                    >{{ formatPrice(billing.pro.amount, billing.pro.currency) }}/{{ billing.pro.recurringInterval }}
                        <span
                            class="originalPrice"
                            v-if="billing.pro.product.prices && billing.pro.product.prices[0].priceAmount > billing.pro.amount"
                        >
                            {{ formatPrice(billing.pro.product.prices[0].priceAmount, billing.pro.product.prices[0].priceCurrency) }}/{{ billing.pro.product.prices[0].recurringInterval }}
                        </span>
                    </v-chip>
                </template>
            </template>
            <template v-else-if="billing.inactiveSubscription">
                Ended on {{ formatDate(billing.inactiveSubscription.endedAt) }}.
            </template>
        </v-card-subtitle>
        <v-card-text>
            <v-btn
                :href="billing.session.customerPortalUrl"
                target="_blank"
            >
                Open billing portal
            </v-btn>
        </v-card-text>
    </v-card>
</template>

<script setup>
import { onMounted, shallowRef } from "vue";

import { billing as billingStore, getLimits, getProCheckout, getProProduct } from "@/stores/billing";
import { create as createDialog } from "@/stores/dialogs";
import { useStore } from "@nanostores/vue";

import { VBtn, VCard, VCardSubtitle, VCardText, VCardTitle, VChip, VProgressCircular } from "vuetify/components";


const billing = useStore(billingStore);

const proCheckoutLoading = shallowRef(false);

const proLoading = shallowRef(false);
const proPrice = shallowRef("");
const proPublicListLimit = shallowRef(null);
const proPrivateListLimit = shallowRef(null);
const proItemsPerListLimit = shallowRef(null);

const formatPrice = (price, currency) => {
    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0
    }).format(price / 100);

    return formattedPrice;
};

const loadProPrice = async () => {
    proLoading.value = true;
    try {
        const proProduct = await getProProduct();

        const price = proProduct.price;

        const formattedPrice = formatPrice(price.priceAmount, price.priceCurrency);

        proLoading.value = false;
        proPrice.value = formattedPrice + "/" + price.recurringInterval;

        const limits = getLimits(proProduct.benefits);

        proPublicListLimit.value = limits.publicLists;
        proPrivateListLimit.value = limits.privateLists;
        proItemsPerListLimit.value = limits.itemsPerList;

        return proPrice.value;
    } catch (error) {
        console.error("Failed to load Pro pricing:", error);
        proLoading.value = false;
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
                        &.disclaimer {
                            width: 100%;
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

    .subscription-details {
        .originalPrice {
            text-decoration: line-through;
            opacity: 0.7;
            margin-left: 0.5rem;
        }
    }

    @media screen and (max-width: 768px) {
        .page-content .pricing {
            display: flex;
            flex-direction: column;
            padding-top: 1rem;
            thead {
                tr {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    width: 100%;
                    th:first-of-type {
                        display: none;
                    }
                }
            }
            tbody { 
                tr {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    align-items: center;
                    place-items: center;
                    margin-top: 1rem;
                    td {
                        &:first-of-type {
                            display: none;
                        }
                        .value {
                            font-size: 1.5rem;
                        }
                        .name {
                            font-weight: bold;
                        }
                    }
                    &.buttons {
                        td {
                            grid-column: 1/3;
                            padding-top: 1rem;
                            &:not(:last-of-type) {
                                display: none;
                            }
                        }
                    }
                }
            }
        }
    }
}
</style>