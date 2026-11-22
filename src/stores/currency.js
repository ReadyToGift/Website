import { currencies as currencyList } from "country-data-list";

export const currencies = currencyList.all;

export const getCurrency = (code) => {
    const currency = currencies.find((currency) => currency.code === code);

    if (!currency) {
        return {
            code: "USD",
            symbol: "$",
        };
    }

    return currency;
};

export const formatter = (code) => {
    const currency = getCurrency(code);
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: currency?.decimalDigits || 2,
        maximumFractionDigits: currency?.decimalDigits || 2,
    });
};

export const formatMinorCurrency = (amount, code) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 0,
    }).format(amount / 100);

export default {
    formatMinorCurrency,
    getCurrency,
    formatter,
};
