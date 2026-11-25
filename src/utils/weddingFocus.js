export const normalizeFocus = (value) => {
    const number =
        typeof value === "number" ||
        (typeof value === "string" && value.trim() !== "")
            ? Number(value)
            : Number.NaN;

    return Number.isFinite(number)
        ? Math.min(100, Math.max(0, Math.round(number)))
        : 50;
};

export const focusPosition = (image) =>
    `${normalizeFocus(image?.focusX)}% ${normalizeFocus(image?.focusY)}%`;

export const focusAfterDrag = (startFocus, distance, overflow) =>
    overflow > 0
        ? normalizeFocus(
              normalizeFocus(startFocus) - (distance / overflow) * 100,
          )
        : normalizeFocus(startFocus);
