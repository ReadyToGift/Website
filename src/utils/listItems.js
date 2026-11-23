import { formatter as currencyFormatter } from "@/stores/currency";
import validation from "@/utils/validation";

export const DEFAULT_PRICE_GROUPS = [
    0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

export const WEDDING_PRICE_GROUPS = [0, 10, 50, 200];

const visibleItems = ({ items, showFulfilled, wishlistOwner }) =>
    items.filter((item) => showFulfilled || wishlistOwner || !item.fulfillment);

const sortItems = ({ items, sort, wishlistOwner }) =>
    [...items].sort((a, b) => {
        if (!wishlistOwner) {
            if (a.fulfillment && !b.fulfillment) return 1;
            if (!a.fulfillment && b.fulfillment) return -1;
        }

        if (sort === "price") return (a.price ?? 0) - (b.price ?? 0);
        return String(a.title || "").localeCompare(String(b.title || ""));
    });

const groupPrice = (currency, value) =>
    currencyFormatter(currency).format(value).split(".")[0];

export const groupListItems = ({
    communityItems = [],
    currency = "USD",
    flexibleTitle = "Flexible Gifts",
    includeCommunityItems = true,
    items = [],
    priceGroups = DEFAULT_PRICE_GROUPS,
    rangeSeparator = " - ",
    showFulfilled = true,
    sort = "price",
    wishlistOwner = false,
}) => {
    const visible = visibleItems({ items, showFulfilled, wishlistOwner });
    const groups = priceGroups
        .map((upperBound, index) => {
            const lowerBound = index === 0 ? 0 : priceGroups[index - 1];
            const groupedItems = visible.filter((item) => {
                const price = item.price ?? 0;
                return upperBound === 0
                    ? price === 0
                    : price >= lowerBound && price < upperBound && price !== 0;
            });

            return {
                id: upperBound,
                items: sortItems({
                    items: groupedItems,
                    sort,
                    wishlistOwner,
                }),
                title:
                    upperBound === 0
                        ? flexibleTitle
                        : `${groupPrice(currency, lowerBound)}${rangeSeparator}${groupPrice(currency, upperBound)}`,
            };
        })
        .filter((group) => group.items.length > 0);

    const largestPrice = priceGroups.at(-1);
    const above = visible.filter((item) => (item.price ?? 0) >= largestPrice);
    if (above.length > 0) {
        groups.push({
            id: "above",
            items: sortItems({ items: above, sort, wishlistOwner }),
            title: `${groupPrice(currency, largestPrice)}+`,
        });
    }

    if (includeCommunityItems && communityItems.length > 0) {
        groups.push({
            id: "contributed",
            items: sortItems({
                items: communityItems,
                sort,
                wishlistOwner: true,
            }),
            title: "Gifts from others",
        });
    }

    return groups;
};

export const getWebsiteUrl = (value) => {
    if (typeof value !== "string") return null;
    const candidate = value.match(validation.urlRegex)?.[0];
    if (!candidate) return null;

    try {
        const url = new URL(
            candidate.startsWith("www.") ? `https://${candidate}` : candidate,
        );
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
};

export const getWebsiteHostname = (value) => {
    const url = getWebsiteUrl(value);
    return url ? new URL(url).hostname.replace(/^www\./, "").toLowerCase() : "";
};

export const getItemImageUrl = (
    item,
    imageBaseUrl = "/api/content/item/image",
) => {
    if (item?.imageID && imageBaseUrl) {
        return `${imageBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(item.imageID)}`;
    }
    return item?.image || null;
};
