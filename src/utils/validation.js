const mainUrlRegex =
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w-_]*)?\??(?:[-+=&;%@.\w_]*)#?(?:[\w]*))?)/;

export const MAX_ITEM_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_TEXT_LENGTHS = {
    name: 128,
    title: 128,
    description: 4000,
    url: 2048,
    shortUrl: 64,
    fulfillmentName: 32,
    reportDetails: 1000,
};
export const sanitizeText = (value, maxLength) => {
    if (typeof value !== "string") return null;
    return value
        .normalize("NFKC")
        .split("")
        .filter((character) => {
            const code = character.charCodeAt(0);
            return (
                code === 9 ||
                code === 10 ||
                code === 13 ||
                (code >= 32 && code !== 127)
            );
        })
        .join("")
        .trim()
        .slice(0, maxLength);
};

export const escapeHtml = (value, maxLength = 100_000) =>
    String(sanitizeText(String(value ?? ""), maxLength) ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

export const isSafeHttpUrl = (value) => {
    if (typeof value !== "string" || value.length > MAX_TEXT_LENGTHS.url)
        return false;
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
        return false;
    }
};

const matchesSignature = (bytes, signature, offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);

export const validateImageFile = async (
    file,
    maxBytes = MAX_ITEM_IMAGE_BYTES,
) => {
    if (
        !file ||
        typeof file === "string" ||
        typeof file.arrayBuffer !== "function"
    )
        return { ok: false, message: "Invalid image file" };
    if (
        !Number.isSafeInteger(file.size) ||
        file.size <= 0 ||
        file.size > maxBytes
    )
        return {
            ok: false,
            message: `Image must be smaller than ${Math.floor(maxBytes / 1024 / 1024)}MB`,
        };
    const bytes = new Uint8Array(await file.arrayBuffer());
    let type = null;
    if (
        matchesSignature(
            bytes,
            [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        )
    )
        type = "image/png";
    else if (matchesSignature(bytes, [0xff, 0xd8, 0xff])) type = "image/jpeg";
    else if (matchesSignature(bytes, [0x47, 0x49, 0x46, 0x38]))
        type = "image/gif";
    else if (
        matchesSignature(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        matchesSignature(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    )
        type = "image/webp";
    if (!type)
        return {
            ok: false,
            message: "Only PNG, JPEG, GIF, and WebP images are allowed",
        };
    return { ok: true, type, bytes };
};

export const validateImageDataUrl = async (
    value,
    maxBytes = MAX_AVATAR_BYTES,
) => {
    if (typeof value !== "string")
        return { ok: false, message: "Invalid profile image" };
    const match = value.match(
        /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!match)
        return {
            ok: false,
            message: "Only PNG, JPEG, GIF, and WebP profile images are allowed",
        };
    try {
        const bytes = Uint8Array.from(atob(match[2]), (character) =>
            character.charCodeAt(0),
        );
        return validateImageFile(
            new Blob([bytes], { type: match[1] }),
            maxBytes,
        );
    } catch {
        return { ok: false, message: "Invalid profile image" };
    }
};

export default {
    urlRegex: new RegExp(mainUrlRegex),
    urlRegexGlobal: new RegExp(mainUrlRegex, "g"),
};
