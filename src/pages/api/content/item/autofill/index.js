import getBestImage from "./_modules/get-best-image.js";
import { getLinkPreview } from "./_modules/link-preview-js.js";
import getSite from "./_modules/get-site.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Polar } from "@polar-sh/sdk";
import { TidyURL } from "tidy-url";

import { getUserLimits } from "@/server/billing.js";

import { requireAuth } from "@/server/appwrite.js";

import { AUTOFILL_HTTP_PROXIES, AUTOFILL_PROXY_COUNTRY_PREFIX, AUTOFILL_PROXY_HOST, AUTOFILL_PROXY_PASSWORD, AUTOFILL_PROXY_USERNAME, AUTOFILL_USE_LOCAL_FETCH, POLAR_ACCESS_TOKEN } from "astro:env/server";
import { AUTOFILL_PROXY_ATTEMPTS } from "astro:env/client";

let polar;

if (POLAR_ACCESS_TOKEN) {
    polar = new Polar({
        accessToken: POLAR_ACCESS_TOKEN
    });
}

const toPolarExternalCustomerId = (id) => {
    if (!id) return id;
    return id.startsWith("appwrite:") ? id : `appwrite:${id}`;
};

const bandwidthCostPerGB = {
    currency: "usd",
    amount: 8
};

const formatTitle = (data, site) => {
    let { title, description } = data;

    if (!title) title = description;

    if (title) {
        if (site === "amazon") {
            title = title
                .replace(/^Amazon\.[^:]+:\s*/, "")
                .replace(
                    "Free delivery and returns on all eligible orders. Shop ",
                    ""
                )
                .replace(/\s*:\s*.*$/, "");
        }
    }

    return title ? title.slice(0, 128).trim() : "";
};

const getRequestMethods = ({ country }) => {
    const requestMethods = [];

    if (AUTOFILL_USE_LOCAL_FETCH !== "false") {
        requestMethods.push({
            type: "standard",
            name: "Local Fetch"
        });
    }

    const proxies = AUTOFILL_HTTP_PROXIES
        ? AUTOFILL_HTTP_PROXIES.split(",")
        : [];

    for (const [index, proxy] of proxies.entries()) {
        requestMethods.push({
            type: "proxy",
            name: `Proxy ${index + 1}`,
            proxy
        });
    }

    let proxyUsername = AUTOFILL_PROXY_USERNAME;
    const proxyCountryPrefix = AUTOFILL_PROXY_COUNTRY_PREFIX;
    const proxyPassword = AUTOFILL_PROXY_PASSWORD;
    const proxyHost = AUTOFILL_PROXY_HOST;
    const proxyAttempts = parseInt(AUTOFILL_PROXY_ATTEMPTS) || 0;

    if (proxyUsername && proxyPassword && proxyHost && proxyAttempts && proxyAttempts > 0) {
        if (proxyUsername && proxyUsername.includes("{country}")) {
            if (country) {
                proxyUsername = proxyUsername.replace("{country}", proxyCountryPrefix + country);
            } else {
                proxyUsername = proxyUsername.replace("{country}", "");
            }
        }

        for (let i = 0; i < proxyAttempts; i++) {
            const authPart = proxyUsername && proxyPassword
                ? `${proxyUsername}:${proxyPassword}@`
                : "";
            const proxyUrl = `http://${authPart}${proxyHost}`;

            requestMethods.push({
                type: "proxy",
                name: `Rotating Proxy ${i + 1}`,
                proxy: proxyUrl
            });
        }
    }

    return requestMethods;
};

const getPreview = async ({
    url,
    requestMethods,
    site,
    itemID,
    userID,
    updateStatus
}) => {
    console.log(`Total request methods to try: ${requestMethods.length}`);
    const externalCustomerId = toPolarExternalCustomerId(userID);

    let totalBandwidth = 0;

    for (const [index, method] of requestMethods.entries()) {
        console.log(`Trying request method: ${method.name}`);

        await updateStatus({
            status: "processing",
            attempt: index + 1,
            attemptStatus: "starting",
            totalAttempts: requestMethods.length
        });

        const fetchOptions = {
            followRedirects: "follow",
            headers: {
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
            },
            timeout: 15000,
            agent:
                method.type === "proxy"
                    ? new HttpsProxyAgent(method.proxy)
                    : null
        };

        try {
            const data = await getLinkPreview(
                { url },
                fetchOptions
            );

            await updateStatus({
                attemptStatus: "processing"
            });

            totalBandwidth += parseInt(data.size) || 0;

            console.log(`Request method succeeded: ${method.name}`);

            if (
                site === "amazon" &&
                data.images &&
                data.images.find((img) => img.src.includes("/captcha/"))
            ) {
                throw new Error(
                    "Amazon is blocking access to the page with a CAPTCHA, please try again later."
                );
            }

            if (data.images && data.images.length) {
                await updateStatus({
                    attemptStatus: "finding-best-image"
                });
                const bestImageResult = await getBestImage({
                    images: data.images,
                    site,
                    fetchOptions
                });

                totalBandwidth += bestImageResult.fetchedSize || 0;

                totalBandwidth += bestImageResult.fetchedSize || 0;

                if (bestImageResult.image) {
                    const bestImage = bestImageResult.image;
                    console.log(
                        "Best image found:",
                        JSON.stringify(bestImage.image, null, 2)
                    );

                    data.bestImage = {
                        src: bestImage.image.src,
                        width: bestImage.width,
                        height: bestImage.height
                    };
                } else {
                    console.log("No suitable image found.");
                }
            }

            await updateStatus({
                attempt: index + 1,
                attemptStatus: "completed"
            });


            const bandwidthGB = totalBandwidth / (1024 * 1024 * 1024);
            const costInCents = parseFloat(
                (bandwidthGB * bandwidthCostPerGB.amount).toFixed(12)
            );

            try {
                await polar.events.ingest({
                    events: [
                        {
                            name: "autofill",
                            externalCustomerId,
                            metadata: {
                                itemID,
                                imageFound: data.imageID ? true : false,
                                totalBandwidth,
                                _cost: {
                                    amount: costInCents,
                                    currency: bandwidthCostPerGB.currency
                                }
                            }
                        }
                    ]
                });
            } catch (err) {
                console.error(`Polar event ingestion failed: ${err.message}`);
            }

            return data;
        } catch (err) {
            await updateStatus({
                attemptStatus: "failed"
            });
            console.error(`Request method failed: ${method.name} - ${err.message}`);
            // try next method
        }
    }

    await updateStatus({
        status: "failed"
    });

    throw new Error("All request methods failed, it may be blocked.");
};

export const POST = async (context) => {
    try {
        const { sessionClient, account } = await requireAuth(context);

        if (!sessionClient || !account) {
            return new Response(
                JSON.stringify({
                    message: "Unauthenticated"
                }),
                {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        try {
            let autofillStartTime = new Date();
            const { url, currency, itemID } = await context.request.json();

            const userID = account.$id;

            if (!url) {
                return new Response(
                    JSON.stringify({
                        message: "No URL provided"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            if (!itemID) {
                return new Response(
                    JSON.stringify({
                        message: "No item ID provided"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            const { limits } = await getUserLimits({ account });

            if (!limits.autofill) {
                return new Response(
                    JSON.stringify({
                        message: "Autofill feature is not enabled for this user"
                    }),
                    {
                        status: 403,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            const countryMap = {
                USD: "us",
                GBP: "gb",
                EUR: "eu",
                AUD: "au",
                CAD: "ca"
            };

            let country = "";
            if (currency && countryMap[currency]) {
                country = countryMap[currency];
            }

            const site = getSite(url);

            const requestMethods = getRequestMethods({ country });

            // https://www.koyeb.com/tutorials/using-astro-and-server-sent-events-sse-to-build-realtime-in-app-notifications#create-a-server-sent-events-api-in-astro
            const stream = new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    const updateStatus = (data) => {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                timestamp: new Date().toISOString(),
                                ...data
                            })}\n\n`)
                        );
                    };

                    updateStatus({
                        message: "Autofill started",
                        status: "processing",
                        attempt: 0,
                        totalAttempts: requestMethods.length
                    });

                    const data = await getPreview({
                        url,
                        requestMethods,
                        site,
                        itemID,
                        userID,
                        updateStatus
                    });

                    const autofillData = {
                        title: formatTitle(data, site),
                        url: data.url ? TidyURL.clean(data.url).url : "",
                        image: "",
                        bestImage: data.bestImage || null,
                        imageID: data.imageID,
                        imageSize: data.imageSize,
                        images: data.images,
                        price: data.price
                    };

                    updateStatus({
                        message: "Autofill completed",
                        status: "completed",
                        executionTime:
                            new Date().getTime() - autofillStartTime.getTime(),
                        outputData: autofillData
                    });

                    controller.close();
                }
            });

            return new Response(stream, {
                headers: {
                    Connection: "keep-alive",
                    "Content-Type": "text/event-stream; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                    "Content-Encoding": "none"
                }
            });
        } catch (err) {
            console.error(err.message);

            return new Response(
                JSON.stringify({
                    message: err.message
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }
    } catch (err) {
        console.error(err.message);

        return new Response(
            JSON.stringify({
                message: err.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
};
