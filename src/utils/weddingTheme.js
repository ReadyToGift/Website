export const WEDDING_ACCENTS = [
    { title: "Navy", value: "#083C62" },
    { title: "Slate", value: "#244B5A" },
    { title: "Plum", value: "#4A3B59" },
    { title: "Burgundy", value: "#633B3B" },
    { title: "Forest", value: "#2F5D50" },
    { title: "Umber", value: "#6B4F2A" },
];

export const DEFAULT_WEDDING_ACCENT = WEDDING_ACCENTS[0].value;

export const normalizeWeddingAccent = (value) =>
    typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
        ? value.toUpperCase()
        : DEFAULT_WEDDING_ACCENT;

export const weddingAccentTheme = (value) => {
    const accent = normalizeWeddingAccent(value);
    return (
        WEDDING_ACCENTS.find(
            (option) => option.value === accent,
        )?.title.toLowerCase() || "custom"
    );
};
