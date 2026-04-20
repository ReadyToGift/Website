import {
    Client,
    Databases,
    ID,
    Permission,
    Role,
    Storage,
} from "node-appwrite";
import getBestImage from "./modules/get-best-image.js";
import { getLinkPreview } from "./link-preview-js.js";
import getSite from "./get-site.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Polar } from "@polar-sh/sdk";
import { TidyURL } from "tidy-url";

let polar;

if (process.env.POLAR_ACCESS_TOKEN) {
    polar = new Polar({
        accessToken: process.env["POLAR_ACCESS_TOKEN"],
    });
}

const toPolarExternalCustomerId = (id) => {
    if (!id) return id;
    return id.startsWith("appwrite:") ? id : `appwrite:${id}`;
};

const bandwidthCostPerGB = {
    currency: "usd",
    amount: 8,
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

const getPreview = async (
    url,
    country,
    site,
    storage,
    itemID,
    userID,
    { log, error }
) => {
    const requestMethods = [];

    if (process.env.APPWRITE_USE_LOCAL_FETCH !== "false") {
        requestMethods.push({
            type: "standard",
            name: "Local Fetch",
        });
    }

    const proxies = process.env.APPWRITE_HTTP_PROXIES
        ? process.env.APPWRITE_HTTP_PROXIES.split(",")
        : [];

    for (const [index, proxy] of proxies.entries()) {
        requestMethods.push({
            type: "proxy",
            name: `Proxy ${index + 1}`,
            proxy,
        });
    }

    let proxyUsername = process.env.APPWRITE_PROXY_USERNAME;
    const proxyCountryPrefix = process.env.APPWRITE_PROXY_COUNTRY_PREFIX;
    const proxyPassword = process.env.APPWRITE_PROXY_PASSWORD;
    const proxyHost = process.env.APPWRITE_PROXY_HOST;
    const proxyAttempts = parseInt(process.env.APPWRITE_PROXY_ATTEMPTS) || 0;

    if (
        proxyUsername &&
        proxyPassword &&
        proxyHost &&
        proxyAttempts &&
        proxyAttempts > 0
    ) {
        if (proxyUsername && proxyUsername.includes("{country}")) {
            if (country) {
                proxyUsername = proxyUsername.replace(
                    "{country}",
                    proxyCountryPrefix + country
                );
            } else {
                proxyUsername = proxyUsername.replace("{country}", "");
            }
        }

        for (let i = 0; i < proxyAttempts; i++) {
            const authPart =
                proxyUsername && proxyPassword
                    ? `${proxyUsername}:${proxyPassword}@`
                    : "";
            const proxyUrl = `http://${authPart}${proxyHost}`;

            requestMethods.push({
                type: "proxy",
                name: `Rotating Proxy ${i + 1}`,
                proxy: proxyUrl,
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
    executionID,
    databases,
    log,
    error,
    userID,
    userID,
}) => {
    const externalCustomerId = toPolarExternalCustomerId(userID);

    const updateStatus = (data) => {
        return databases.updateDocument(
            "wishlist",
            "autofills",
            executionID,
            data
        );
    };

    log(`Total request methods to try: ${requestMethods.length}`);

    let totalBandwidth = 0;

    for (const [index, method] of requestMethods.entries()) {
        log(`Trying request method: ${method.name}`);

        await updateStatus({
            attempt: index + 1,
            attemptStatus: "starting",
            totalAttempts: requestMethods.length,
        });

        const fetchOptions = {
            followRedirects: "follow",
            headers: {
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            },
            timeout: 15000,
            agent:
                method.type === "proxy"
                    ? new HttpsProxyAgent(method.proxy)
                    : null,
        };

        try {
            const data = await getLinkPreview(
                { url, log, error },
                fetchOptions
            );

            await updateStatus({
                attemptStatus: "processing",
            });

            totalBandwidth += parseInt(data.size) || 0;

            log(`Request method succeeded: ${method.name}`);

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
                    attemptStatus: "finding-best-image",
                });
                const bestImageResultResult = await getBestImage({
                    images: data.images,
                    site,
                    fetchOptions,
                    log,
                });

                totalBandwidth += bestImageResult.fetchedSize || 0;

                totalBandwidth += bestImageResult.fetchedSize || 0;

                if (bestImageResult.image) {
                    const bestImage = bestImageResult.image;
                    log(
                        "Best image found:",
                        JSON.stringify(bestImage.image, null, 2)
                    );
                    try {
                        // delete original
                        await storage.deleteFile(
                            "66866e74001d3e2f2629",
                            itemID
                        );
                    } catch {
                        // ignore error if file does not exist
                    }

                    log({ length: bestImage.data.byteLength });

                    const imageBuffer = Buffer.from(bestImage.data);

                    const mimeType = bestImage.contentType || "image/jpeg";
                    const fileExt = mime.extension(mimeType) || "png";

                    const result = await storage.createFile(
                        "66866e74001d3e2f2629",
                        itemID,
                        InputFile.fromBuffer(imageBuffer, `image.${fileExt}`)
                    );

                    data.imageID = result.$id;
                    data.imageSize = result.sizeOriginal;
                } else {
                    log("No suitable image found.");
                }
            }

            await updateStatus({
                attempt: index + 1,
                attemptStatus: "completed",
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
                                    currency: bandwidthCostPerGB.currency,
                                },
                            },
                        },
                    ],
                });
            } catch (err) {
                error(`Polar event ingestion failed: ${err.message}`);
            }

            return data;
        } catch (err) {
            await updateStatus({
                attemptStatus: "failed",
            });
            error(`Request method failed: ${method.name} - ${err.message}`);
            // try next method
        }
    }

    await updateStatus({
        status: "failed",
    });

    throw new Error("All request methods failed, it may be blocked.");
};

export default async ({ req, res, log, error }) => {
    try {
        let executionRowExists = false;
        let executionID = null;

        const client = new Client()
            .setEndpoint("https://appwrite.readyto.gift/v1") // Your API Endpoint
            .setProject("6838baa30010ce23e059") // Your project ID
            .setJWT(req.headers["x-appwrite-user-jwt"]);

        const storage = new Storage(client);
        const databases = new Databases(client);
        try {
            let functionStartTime = new Date();
            const { url, currency, itemID } = req.bodyJson;
            const userID = req.headers["x-appwrite-user-id"];
            const externalCustomerId = toPolarExternalCustomerId(userID);

            if (!url) {
                return res.json({
                    error: "No URL provided",
                });
            }

            if (!itemID) {
                return res.json({
                    error: "No item ID provided",
                });
            }

            let enableAutofill =
                process.env.FREE_TIER_ENABLE_AUTOFILL === "true";

            if (polar) {
                const customer = await polar.customers.getExternal({
                    externalId: externalCustomerId,
                });

                if (customer.id) {
                    console.log(
                        `Fetching benefits for customer ID: ${customer.id}`
                    );
                    const benefits = await polar.benefitGrants.list({
                        customerId: customer.id,
                        isGranted: true,
                    });

                    const benefitNames = benefits.result.items.map(
                        (b) => b.benefit.description
                    );

                    if (benefitNames.includes("Autofill")) {
                        enableAutofill = true;
                        log("Autofill benefit is granted to the user.");
                    }
                }
            }

            if (!enableAutofill) {
                return res.json(
                    {
                        error: "Autofill feature is not enabled for this user",
                    },
                    403
                );
            }

            let enableAutofill =
                process.env.FREE_TIER_ENABLE_AUTOFILL === "true";
            const customer = await polar.customers.get({
                externalCustomerId,
            });

            if (customer.id) {
                console.log(
                    `Fetching benefits for customer ID: ${customer.id}`
                );
                const benefits = await polar.benefitGrants.list({
                    customerId: customer.id,
                    isGranted: true,
                });

                const benefitNames = benefits.result.items.map(
                    (b) => b.benefit.description
                );

                if (benefitNames.includes("Autofill")) {
                    enableAutofill = true;
                    log("Autofill benefit is granted to the user.");
                }
            }

            if (!enableAutofill) {
                return res.json(
                    {
                        error: "Autofill feature is not enabled for this user",
                    },
                    403
                );
            }

            let enableAutofill =
                process.env.FREE_TIER_ENABLE_AUTOFILL === "true";
            const customer = await polar.customers.get({
                externalCustomerId,
            });

            if (customer.id) {
                console.log(
                    `Fetching benefits for customer ID: ${customer.id}`
                );
                const benefits = await polar.benefitGrants.list({
                    customerId: customer.id,
                    isGranted: true,
                });

                const benefitNames = benefits.result.items.map(
                    (b) => b.benefit.description
                );

                if (benefitNames.includes("Autofill")) {
                    enableAutofill = true;
                    log("Autofill benefit is granted to the user.");
                }
            }

            if (!enableAutofill) {
                return res.json(
                    {
                        error: "Autofill feature is not enabled for this user",
                    },
                    403
                );
            }

            const countryMap = {
                USD: "us",
                GBP: "gb",
                EUR: "eu",
                AUD: "au",
                CAD: "ca",
            };

            executionID =
                req.headers["x-appwrite-execution-id"] || `dev-${ID.unique()}`;

            let country = "";
            if (currency && countryMap[currency]) {
                country = countryMap[currency];
            }

            const site = getSite(url);

            const requestMethods = getRequestMethods({ country });

            await databases.createDocument(
                "wishlist",
                "autofills",
                executionID,
                {
                    attempt: 0,
                    totalAttempts: requestMethods.length,
                    status: "processing",
                    autofillURL: url,
                },
                [
                    Permission.write(Role.user(userID)),
                    Permission.read(Role.user(userID)),
                ]
            );

            executionRowExists = true;

            const data = await getPreview({
                url,
                requestMethods,
                site,
                storage,
                itemID,
                executionID,
                databases,
                log,
                error,
            });

            const autofillData = {
                title: formatTitle(data, site),
                url: data.url ? TidyURL.clean(data.url).url : "",
                image: "",
                bestImage: data.bestImage || null,
                imageID: data.imageID,
                imageSize: data.imageSize,
                images: data.images,
                price: data.price,
            };

            await databases.updateDocument(
                "wishlist",
                "autofills",
                executionID,
                {
                    status: "completed",
                    executionTime:
                        new Date().getTime() - functionStartTime.getTime(),
                    outputData: JSON.stringify(autofillData),
                }
            );

            return res.json(autofillData, 200);
        } catch (err) {
            error(err.message);

            if (executionRowExists) {
                await databases.updateDocument(
                    "wishlist",
                    "autofills",
                    executionID,
                    {
                        status: "failed",
                        outputData: err.message,
                    }
                );
            }

            return res.json(
                {
                    error: err.message,
                },
                500
            );
        }
    } catch (err) {
        error(err.message);

        return res.json(
            {
                error: err.message,
            },
            500
        );
    }
};
