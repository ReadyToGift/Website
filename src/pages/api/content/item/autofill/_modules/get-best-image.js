import { Buffer } from "buffer";
import imageSize from "image-size";

const minimumImageSize = 100; // Minimum width or height in pixels
const maxSize = 20 * 1024 * 1024; // 20MB
const maxFetchedSize = 40 * 1024 * 1024; // 40MB
const maxFetchedImages = 20; // Limit number of images to fetch

const isInvalidImage = url => {
    const lower = url.toLowerCase();
    return (
        lower.includes("transparent-pixel") ||
        lower.includes("grey-pixel") ||
        lower.includes("pixel.gif") ||
        lower.includes("loading-4x-gray") ||
        lower.includes("sprite") ||
        lower.includes("marketing")
    );
};

const getHighRes = (image) => {
    const highResTransforms = [
        {
            name: "amazon",
            transform: (input) => {
                const re = /^(https?:\/\/[^/]+)(\/images\/I\/)([^/.]+)\.[^/]*?(\.jpe?g)$/i;

                const transform = url => {
                    const m = url.match(re);
                    if (!m) return url;
                    const [, protoDom, path, base, ext] = m;
                    return `${protoDom}${path}${base}${ext}`; // rebuild the clean URL
                };

                return transform(input);
            }
        }
    ];

    for (const { name, transform } of highResTransforms) {
        const transformed = transform(image.src);
        if (transformed !== image.src) {
            return {
                ...image,
                src: transformed,
                highResSource: name
            };
        }
    }

    return image;
};

export default async ({ images, fetchOptions }) => {
    let fetchedImages = 0;
    let fetchedSize = 0;
    let bestImage = null;
    console.log(`Evaluating ${images.length} images for best fit...`);
    
    for (const image of images) {
        if (bestImage) continue;
        if (fetchedImages >= maxFetchedImages || fetchedSize >= maxFetchedSize) {
            console.log("Image fetch limits reached, stopping further evaluations.");
            break;
        }

        console.log(`Evaluating image: ${image.src}`);

        image.src = getHighRes(image).src;

        if (!image.src || isInvalidImage(image.src)) {
            console.log(`Skipping invalid image: ${image.src}`);
            continue;
        }

        try {
            const response = await fetch(image.src, {
                method: "HEAD",
                ...fetchOptions
            });

            if (!response.ok) continue;

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.startsWith("image/")) continue;

            const contentLength = response.headers.get("content-length");
            console.log(`Image content length: ${contentLength}`);
            if (contentLength && parseInt(contentLength, 10) < 1024) {
                console.log(`Skipping image (too small): ${image.src}`);
                continue; // Skip images smaller than 1KB
            }
            if (contentLength && parseInt(contentLength, 10) > maxSize){
                console.log(`Skipping image (too large): ${image.src}`);
                continue; // Skip images larger than maxSize
            }

            const imageResponse = await fetch(image.src, fetchOptions);
            console.log(`Fetching image: ${image.src}`);
            if (!imageResponse.ok) {
                console.log(`Failed to fetch image: ${image.src}`);
                continue;
            }

            const buffer = await imageResponse.arrayBuffer();
            fetchedSize += buffer.byteLength;
            fetchedImages++;

            const dimensions = imageSize(Buffer.from(buffer));

            if (
                dimensions.width >= minimumImageSize && dimensions.height >= minimumImageSize
            ) {
                image.width = dimensions.width;
                image.height = dimensions.height;
                // Found a suitable image
                bestImage = {
                    image,
                    width: dimensions.width,
                    height: dimensions.height,
                    size: buffer.byteLength,
                    contentType,
                    data: buffer,
                    fetchedSize
                };
                continue;
            }
        } catch (error) {
            console.log(`Error fetching image: ${image.src} - ${error.message}`);
            continue; // Skip images that cause fetch errors
        }
    }

    console.log("Image evaluation complete.");
    console.log(`Best image: ${bestImage ? JSON.stringify(bestImage.image) : "None found"}`);
    console.log(`Total fetched images: ${fetchedImages}/${maxFetchedImages}, Total fetched size: ${fetchedSize}/${maxFetchedSize} bytes`);

    return {
        image: bestImage,
        fetchedSize
    };
};
