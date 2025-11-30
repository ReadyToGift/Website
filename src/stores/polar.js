import { defineStore } from "pinia";
import { functions } from "@/appwrite";
import { Polar } from "@polar-sh/sdk";
import { useUserLists } from "./userLists";

import {
    ENABLE_POLAR,
    FREE_TIER_ENABLE_AUTOFILL,
    FREE_TIER_PUBLIC_LIST_LIMIT
} from "astro:env/client";

const polar = new Polar();

export const usePolarStore = defineStore("polar", {
    state: () => ({
        sessionLoading: false,
        subscriptions: [],
        session: null,
        publicListLimit: FREE_TIER_PUBLIC_LIST_LIMIT,
        enableAutofill: FREE_TIER_ENABLE_AUTOFILL
    }),
    actions: {
        async init() {
            this.sessionLoading = true;
            if (!ENABLE_POLAR) {
                this.sessionLoading = false;
                return;
            }

            const polarSession = await functions.createExecution({
                functionId: "690fc8f4002cff45eddc",
                async: false
            });

            if (polarSession.status === "completed") {
                const responseData = JSON.parse(polarSession.responseBody);
                this.session = responseData.customerSession;

                const benefits = await polar.customerPortal.benefitGrants.list(
                    {
                        customerSession: this.session.token
                    },
                    {}
                );

                const benefitNames = benefits.result.items.map((b) => b.benefit.description);

                if (benefitNames.includes("Autofill")) {
                    this.enableAutofill = true;
                }

                if (benefitNames.includes("Unlimited Public Lists")) {
                    this.publicListLimit = -1;
                }
            } else {
                console.error("Failed to retrieve Polar session");
            }
            this.sessionLoading = false;
        },
        async getProCheckout() {
            const checkout = await functions.createExecution({
                functionId: "690fc8f4002cff45eddd",
                async: false
            });

            if (checkout.status === "completed") {
                console.log("Polar Pro checkout URL:", checkout.responseBody);
                return JSON.parse(checkout.responseBody).checkoutUrl;
            }

            throw new Error("Failed to retrieve Polar Pro checkout URL");
        },
        async getProPricing() {
            const response = await fetch("/api/checkout/pro/price");
            const data = await response.json();

            if (data.success) {
                return data.price;
            } else {
                throw new Error(data.error || "Failed to fetch Pro pricing");
            }
        },
        async getSubscriptions() {
            const subscriptions = await polar.customerPortal.subscriptions.list(
                {
                    customerSession: this.session.token
                },
                {}
            );

            if (subscriptions.result.pagination.totalCount === 0) {
                this.subscriptions = [];
                this.sessionLoading = false;
                return;
            }

            this.subscriptions = subscriptions.result.items;
        }
    },
    getters: {
        publicListLimitReached() {
            const userLists = useUserLists();
            if (this.publicListLimit === -1) {
                return false;
            }
            return this.publicListLimit <= userLists.listCount.public;
        },
        async getSubscriptions() {
            const subscriptions = await polar.customerPortal.subscriptions.list(
                {
                    customerSession: this.session.token
                },
                {}
            );

            if (subscriptions.result.pagination.totalCount === 0) {
                this.subscriptions = [];
                this.sessionLoading = false;
                return;
            }

            this.subscriptions = subscriptions.result.items;
        }
    },
    getters: {
        publicListLimitReached() {
            const userLists = useUserLists();
            if (this.publicListLimit === -1) {
                return false;
            }
            return this.publicListLimit <= userLists.listCount.public;
        }
    }
});
