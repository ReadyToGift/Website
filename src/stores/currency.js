import { atom } from "nanostores";

export const currencies = atom([]);

export const init = async () => {
    if (import.meta.env.SSR) {
        const getCurrencies = await import("@/pages/api/locale/currencies").then(mod => mod.getCurrencies);
        currencies.set(await getCurrencies());
    } else {
        let response = await fetch("/api/locale/currencies");
        let data = await response.json();
        currencies.set(data.currencies);
    }
};

export const getCurrency = (code) => {
    const currList = currencies.get();
    return currList.find((currency) => currency.code === code);
};

export const formatter = (code) => {
    const currency = getCurrency(code);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.decimalDigits,
        maximumFractionDigits: currency.decimalDigits
    });
};

export default {
    init,
    getCurrency,
    formatter
};