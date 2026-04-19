// Modifed from https://github.com/OP-Engineering/link-preview-js
import * as cheerio from "cheerio";
import AbortController from "abort-controller";
import { CONSTANTS } from "./constants.js";
import getSite from "./get-site.js";
import urlObj from "url";


function throwOnLoopback(address) {
    if (CONSTANTS.REGEX_LOOPBACK.test(address)) {
        throw new Error("SSRF request detected, trying to query host");
    }
}

function metaTag(doc, type, attr) {
    const nodes = doc(`meta[${attr}='${type}']`);
    return nodes?.length ? nodes : null;
}

function metaTagContent(doc, type, attr) {
    return doc(`meta[${attr}='${type}']`).attr("content");
}

function getTitle(doc, url) {
    const site = getSite(url);
    let title =
        metaTagContent(doc, "og:title", "property") ||
        metaTagContent(doc, "og:title", "name");
    if (!title) {
        if (site === "amazon") {
            title = doc("span#productTitle").text();
        } else {
            title = doc("head > title").text();
        }
    }
    return title;
}

function getSiteName(doc) {
    const siteName =
        metaTagContent(doc, "og:site_name", "property") ||
        metaTagContent(doc, "og:site_name", "name");
    return siteName;
}

function getDescription(doc) {
    const description =
        metaTagContent(doc, "description", "name") ||
        metaTagContent(doc, "Description", "name") ||
        metaTagContent(doc, "og:description", "property");
    return description;
}

function getMediaType(doc) {
    const node = metaTag(doc, "medium", "name");
    if (node) {
        const content = node.attr("content");
        return content === "image" ? "photo" : content;
    }
    return (
        metaTagContent(doc, "og:type", "property") ||
        metaTagContent(doc, "og:type", "name")
    );
}

function getImages(doc, rootUrl, imagesPropertyType) {
    let images = [];
    let nodes = null;
    let src = "";
    let dic = [];
    const site = getSite(rootUrl);

    const imagePropertyType = imagesPropertyType ?? "og";
    nodes =
        metaTag(doc, `${imagePropertyType}:image`, "property") ||
        metaTag(doc, `${imagePropertyType}:image`, "name");

    if (nodes) {
        nodes.each((_, node) => {
            if (node.type === "tag") {
                src = node.attribs.content;
                if (src) {
                    src = urlObj.resolve(rootUrl, src);
                    images.push({
                        src,
                        location: "meta"
                    });
                }
            }
        });
    }

    // Fallback to other methods if no images found in meta tags
    if (images && images.length <= 0 && !imagesPropertyType) {
        src = doc("link[rel=image_src]").attr("href");
        if (src) {
            src = urlObj.resolve(rootUrl, src);
            images = [{
                src,
                location: "link"
            }];
        } else {
            nodes = [];
            if (site === "amazon") {
                const ppd = doc("#ppd"); // Just use the main product details section

                if (ppd && ppd.length) {
                    nodes = ppd.find("img");
                }
            }
            if (!nodes || nodes.length === 0) {
                nodes = doc("img");
            }

            if (nodes?.length) {
                dic = {};
                images = [];
                nodes.each((_, node) => {
                    if (node.type === "tag") src = node.attribs.src;
                    if (src && !dic[src]) {
                        dic[src] = true;
                        images.push({
                            src: urlObj.resolve(rootUrl, src),
                            location: "img"
                        });
                    }
                });
            }
        }
    }

    return images;
}

function getPrice(doc, url) {
    const site = getSite(url);

    const metaTagPrice = metaTagContent(doc, "og:price:amount", "property") || metaTagContent(doc, "product:price:amount", "property");
    if (metaTagPrice) return { price: parseFloat(metaTagPrice) };

    if (site === "amazon") {
        const currency = doc("span.a-price-symbol").first().text();
        const wholePriceText = doc("span.a-price-whole").first().contents().first().text();
        const fractionPriceText = doc("span.a-price-fraction").first().contents().first().text();

        const wholePrice = parseInt(wholePriceText, 10);
        const fractionPrice = parseFloat(`0.${fractionPriceText}`);

        const price = wholePrice + fractionPrice;

        return { currency, price };
    } else {
        let price = null;
        let currency = null;
        const pricePatterns = [
            ".pd__cost__retail-price",
            ".price",
            ".price-tag",
            "[class*=\"price\"]",
            "[id*=\"price\"]",
            "[class*=\"amount\"]"
        ];

        pricePatterns.forEach((pattern) => {
            if (price) return;
            console.log(`Trying pattern: ${pattern}`);
            const elements = doc(pattern).toArray();
            console.log(`Found ${elements.length} elements`);
            elements.forEach((element) => {
                if (price) return;
                element = doc(element);
                if (element && element.length) {
                    const text = element.text();
                    if (!text.includes(" / month")) { // Mostly for steam, but should be useful for others anyway
                        const priceMatch = text.match(
                            /(\d{1,3}(,\d{3})*(\.\d{2})?)/
                        );
                        if (priceMatch) {
                            const extractedPrice = priceMatch[0].replace(
                                /,/g,
                                ""
                            );
                            price = parseFloat(extractedPrice);
                            const currencyMatch = text.match(/[^\d.,\s]+/);

                            if (currencyMatch) currency = currencyMatch[0];

                            console.log({ currency });
                        }
                    }
                }
            });
        });

        if (price) return { price, currency };
    }
}

function getVideos(doc) {
    const videos = [];
    let nodeTypes;
    let nodeSecureUrls;
    let nodeType;
    let nodeSecureUrl;
    let video;
    let videoType;
    let videoSecureUrl;
    let width;
    let height;
    let videoObj;
    let index;

    const nodes =
        metaTag(doc, "og:video", "property") ||
        metaTag(doc, "og:video", "name");

    if (nodes?.length) {
        nodeTypes =
            metaTag(doc, "og:video:type", "property") ||
            metaTag(doc, "og:video:type", "name");
        nodeSecureUrls =
            metaTag(doc, "og:video:secure_url", "property") ||
            metaTag(doc, "og:video:secure_url", "name");
        width =
            metaTagContent(doc, "og:video:width", "property") ||
            metaTagContent(doc, "og:video:width", "name");
        height =
            metaTagContent(doc, "og:video:height", "property") ||
            metaTagContent(doc, "og:video:height", "name");

        for (index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            if (node.type === "tag") video = node.attribs.content;

            nodeType = nodeTypes?.[index];
            if (nodeType?.type === "tag") {
                videoType = nodeType ? nodeType.attribs.content : null;
            }

            nodeSecureUrl = nodeSecureUrls?.[index];
            if (nodeSecureUrl?.type === "tag") {
                videoSecureUrl = nodeSecureUrl
                    ? nodeSecureUrl.attribs.content
                    : null;
            }

            videoObj = {
                url: video,
                secureUrl: videoSecureUrl,
                type: videoType,
                width,
                height
            };
            if (videoType && videoType.indexOf("video/") === 0) {
                videos.splice(0, 0, videoObj);
            } else {
                videos.push(videoObj);
            }
        }
    }

    return videos;
}

// returns default favicon (//hostname/favicon.ico) for a url
function getDefaultFavicon(rootUrl) {
    return urlObj.resolve(rootUrl, "/favicon.ico");
}

// returns an array of URLs to favicon images
function getFavicons(doc, rootUrl) {
    const images = [];
    let nodes = [];
    let src;

    const relSelectors = [
        "rel=icon",
        "rel=\"shortcut icon\"",
        "rel=apple-touch-icon"
    ];

    relSelectors.forEach((relSelector) => {
        // look for all icon tags
        nodes = doc(`link[${relSelector}]`);

        // collect all images from icon tags
        if (nodes && nodes.length) {
            nodes.each((_, node) => {
                if (node.type === "tag") src = node.attribs.href;
                if (src) {
                    src = urlObj.resolve(rootUrl, src);
                    images.push(src);
                }
            });
        }
    });

    // if no icon images, use default favicon location
    if (images && images.length <= 0) {
        images.push(getDefaultFavicon(rootUrl));
    }

    return images;
}

function parseImageResponse(url, contentType) {
    return {
        url,
        mediaType: "image",
        contentType,
        favicons: [getDefaultFavicon(url)]
    };
}

function parseAudioResponse(url, contentType) {
    return {
        url,
        mediaType: "audio",
        contentType,
        favicons: [getDefaultFavicon(url)]
    };
}

function parseVideoResponse(url, contentType) {
    return {
        url,
        mediaType: "video",
        contentType,
        favicons: [getDefaultFavicon(url)]
    };
}

function parseApplicationResponse(url, contentType) {
    return {
        url,
        mediaType: "application",
        contentType,
        favicons: [getDefaultFavicon(url)]
    };
}

function parseTextResponse(body, url, options = {}, contentType) {
    const doc = cheerio.load(body);

    return {
        url,
        title: getTitle(doc, url),
        siteName: getSiteName(doc),
        description: getDescription(doc),
        mediaType: getMediaType(doc) || "website",
        contentType,
        images: getImages(doc, url, options.imagesPropertyType),
        videos: getVideos(doc),
        favicons: getFavicons(doc, url),
        price: getPrice(doc, url)
    };
}

function parseUnknownResponse(body, url, options = {}, contentType) {
    return parseTextResponse(body, url, options, contentType);
}

function parseResponse(response, options) {
    try {
        // console.log("[link-preview-js] response", response);
        let contentType = response.headers["content-type"];
        let contentTypeTokens = [];
        let charset = null;

        if (!contentType) {
            return parseUnknownResponse(response.data, response.url, options);
        }

        if (contentType.includes(";")) {
            contentTypeTokens = contentType.split(";");
            contentType = contentTypeTokens[0];

            for (let token of contentTypeTokens) {
                if (token.indexOf("charset=") !== -1) {
                    charset = token.split("=")[1];
                }
            }
        }

        // parse response depending on content type
        if (CONSTANTS.REGEX_CONTENT_TYPE_IMAGE.test(contentType)) {
            return {
                ...parseImageResponse(response.url, contentType),
                charset
            };
        }

        if (CONSTANTS.REGEX_CONTENT_TYPE_AUDIO.test(contentType)) {
            return {
                ...parseAudioResponse(response.url, contentType),
                charset
            };
        }

        if (CONSTANTS.REGEX_CONTENT_TYPE_VIDEO.test(contentType)) {
            return {
                ...parseVideoResponse(response.url, contentType),
                charset
            };
        }

        if (CONSTANTS.REGEX_CONTENT_TYPE_TEXT.test(contentType)) {
            const htmlString = response.data;
            return {
                ...parseTextResponse(
                    htmlString,
                    response.url,
                    options,
                    contentType
                ),
                charset
            };
        }

        if (CONSTANTS.REGEX_CONTENT_TYPE_APPLICATION.test(contentType)) {
            return {
                ...parseApplicationResponse(response.url, contentType),
                charset
            };
        }

        const htmlString = response.data;

        return {
            ...parseUnknownResponse(htmlString, response.url, options),
            charset
        };
    } catch (e) {
        throw new Error(
            `link-preview-js could not fetch link information ${e.toString()}`
        );
    }
}

/**
 * Parses the text, extracts the first link it finds and does a HTTP request
 * to fetch the website content, afterwards it tries to parse the internal HTML
 * and extract the information via meta tags
 * @param text string, text to be parsed
 * @param options ILinkPreviewOptions
 */
export async function getLinkPreview({ url }, fetchOptions) {
    if (!url || typeof url !== "string") {
        throw new Error("Invalid URL");
    }

    const detectedUrl = url
        .replace(/\n/g, " ")
        .split(" ")
        .find((token) => CONSTANTS.REGEX_VALID_URL.test(token));

    if (!detectedUrl) {
        throw new Error(
            "Invalid URL"
        );
    }

    if (fetchOptions?.followRedirects === "manual" && !fetchOptions?.handleRedirects) {
        throw new Error(
            "link-preview-js followRedirects is set to manual, but no handleRedirects function was provided"
        );
    }

    if (fetchOptions?.resolveDNSHost) {
        const resolvedUrl = await fetchOptions.resolveDNSHost(detectedUrl);

        throwOnLoopback(resolvedUrl);
    }

    const timeout = fetchOptions?.timeout ?? 3000; // 3 second timeout default
    const controller = new AbortController();
    const timeoutCounter = setTimeout(() => controller.abort(), timeout);

    const fetchUrl = fetchOptions?.proxyUrl
        ? fetchOptions.proxyUrl.concat(detectedUrl)
        : detectedUrl;

    // Seems like fetchOptions type definition is out of date
    // https://github.com/node-fetch/node-fetch/issues/741
    let response = await fetch(fetchUrl, fetchOptions).catch((e) => {
        if (e.name === "AbortError") {
            throw new Error("Request timeout");
        }

        clearTimeout(timeoutCounter);
        throw e;
    });

    if (
        response.status > 300 &&
        response.status < 309 &&
        fetchOptions.redirect === "manual" &&
        fetchOptions?.handleRedirects
    ) {
        const forwardedUrl = response.headers.get("location") || "";

        if (!fetchOptions.handleRedirects(fetchUrl, forwardedUrl)) {
            throw new Error("Could not handle redirect");
        }

        if (fetchOptions?.resolveDNSHost) {
            const resolvedUrl = await fetchOptions.resolveDNSHost(forwardedUrl);

            throwOnLoopback(resolvedUrl);
        }

        response = await fetch(forwardedUrl, fetchOptions);
    }

    clearTimeout(timeoutCounter);

    if (response.status >= 400) {
        throw new Error(
            `Failed to retrieve website content, status code: ${response.status}`
        );
    }

    const headers = {};
    response.headers.forEach((header, key) => {
        headers[key] = header;
    });

    const normalizedResponse = {
        url: fetchOptions?.proxyUrl
            ? response.url.replace(fetchOptions.proxyUrl, "")
            : response.url,
        headers,
        data: await response.text()
    };

    const parsedResponse = parseResponse(normalizedResponse, fetchOptions);

    if (!parsedResponse || parsedResponse.title === "" || (parsedResponse.images && parsedResponse.images.length === 0)) {
        throw new Error("Could not extract link preview data");
    }

    return {
        ...parsedResponse,
        size: response.headers.get("content-length")
    };
}

/**
 * Skip the library fetching the website for you, instead pass a response object
 * from whatever source you get and use the internal parsing of the HTML to return
 * the necessary information
 * @param response Preview Response
 * @param options IPreviewLinkOptions
 */
export async function getPreviewFromContent(response, options) {
    if (!response || typeof response !== "object") {
        throw new Error(
            "Did not receive a valid response object"
        );
    }

    if (!response.url) {
        throw new Error(
            "Invalid URL"
        );
    }

    return parseResponse(response, options);
}
