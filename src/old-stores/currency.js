import { defineStore } from "pinia";
import { locale } from "@/appwrite";

export const useCurrencyStore = defineStore("currency", {
    state: () => ({
        currencies: []
    }),
    actions: {
        async init() {
            let currencies = await locale.listCurrencies();
            this.currencies = currencies.currencies;
        },
        getCurrency(code) {
            return this.currencies.find((currency) => currency.code === code);
        },
        formatter(code) {
            const currency = this.getCurrency(code);
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: currency.code,
                minimumFractionDigits: currency.decimalDigits,
                maximumFractionDigits: currency.decimalDigits
            });
        }
    }
});
