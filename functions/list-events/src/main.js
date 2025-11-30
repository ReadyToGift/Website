import { Client, Permission, Query, Role, Storage, TablesDB } from "node-appwrite";
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? ""
});

let dryRun = false; // sets dry run for http trigger reconciliation

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(req.headers["x-appwrite-key"] ?? "");

    const tables = new TablesDB(client);
    const storage = new Storage(client);

    const event = req.headers["x-appwrite-event"];
    const user = req.headers["x-appwrite-user-id"];
    const trigger = req.headers["x-appwrite-trigger"];
    const eventParts = event.split(".");
    const eventType = eventParts.at(-1);

    console.log(`Function triggered by ${trigger} event: ${event}`);

    if (trigger === "event" && (eventType === "create" || eventType === "update")) {
        try {
            const listID = eventParts.at(-2);
            let list = await tables.getRow({
                databaseId: process.env.APPWRITE_DATABASE,
                tableId: process.env.APPWRITE_LIST_COLLECTION,
                rowId: listID
            });

            if (!list) {
                error(`List with ID ${listID} not found.`);
                return res.json({
                    error: `List with ID ${listID} not found.`
                });
            }

            let publicListLimit =
                process.env.FREE_TIER_PUBLIC_LIST_LIMIT !== undefined
                    ? parseInt(process.env.FREE_TIER_PUBLIC_LIST_LIMIT)
                    : -1;

            const customer = await polar.customers.getExternal({
                externalId: list.author
            });

            if (customer.id) {
                console.log(`Fetching benefits for customer ID: ${customer.id}`);
                const benefits = await polar.benefitGrants.list({
                    customerId: customer.id,
                    isGranted: true
                });

                const benefitNames = benefits.result.items.map((b) => b.benefit.description);

                if (benefitNames.includes("Unlimited Public Lists")) {
                    publicListLimit = -1;
                }
            }

            const userPrivateLists = await tables.listRows({
                databaseId: process.env.APPWRITE_DATABASE,
                tableId: process.env.APPWRITE_LIST_COLLECTION,
                queries: [
                    Query.equal("author", list.author),
                    Query.equal("private", true),
                    Query.limit(500000)
                ]
            });

            const userPublicLists = await tables.listRows({
                databaseId: process.env.APPWRITE_DATABASE,
                tableId: process.env.APPWRITE_LIST_COLLECTION,
                queries: [
                    Query.equal("author", list.author),
                    Query.equal("private", false),
                    Query.limit(500000)
                ]
            });

            // Only check benefits if user is over the free tier limit
            // This is blocked in the UI, but this is to handle cases where users may have bypassed the UI limits
            if (publicListLimit !== -1 && userPublicLists.total > publicListLimit) {
                console.log(
                    `User ${list.author} is over the free tier public list limit of ${publicListLimit} with ${userPublicLists.total} public lists. Checking Polar benefits...`
                );
                const customer = await polar.customers.getExternal({
                    externalId: list.author
                });

                if (customer.id) {
                    console.log(`Fetching benefits for customer ID: ${customer.id}`);
                    const benefits = await polar.benefitGrants.list({
                        customerId: customer.id,
                        isGranted: true
                    });

                    const benefitNames = benefits.result.items.map((b) => b.benefit.description);

                    if (benefitNames.includes("Unlimited Public Lists")) {
                        publicListLimit = -1;
                    }
                }
            }

            let publicListLimit =
                process.env.FREE_TIER_PUBLIC_LIST_LIMIT !== undefined
                    ? parseInt(process.env.FREE_TIER_PUBLIC_LIST_LIMIT)
                    : -1;

            // Only check benefits if user is over the free tier limit
            // This is blocked in the UI, but this is to handle cases where users may have bypassed the UI limits
            if (publicListLimit !== -1 && userPublicLists.total > publicListLimit) {
                console.log(
                    `User ${list.author} is over the free tier public list limit of ${publicListLimit} with ${userPublicLists.total} public lists. Checking Polar benefits...`
                );
                const customer = await polar.customers.getExternal({
                    externalId: list.author
                });

                if (customer.id) {
                    console.log(`Fetching benefits for customer ID: ${customer.id}`);
                    const benefits = await polar.benefitGrants.list({
                        customerId: customer.id,
                        isGranted: true
                    });

                    const benefitNames = benefits.result.items.map((b) => b.benefit.description);

                    if (benefitNames.includes("Unlimited Public Lists")) {
                        publicListLimit = -1;
                    }
                }
            }

            // Only check benefits if user is over the free tier limit
            // This is blocked in the UI, but this is to handle cases where users may have bypassed the UI limits
            if (publicListLimit !== -1 && userPublicLists.total > publicListLimit) {
                console.log(
                    `User ${list.author} is over the free tier public list limit of ${publicListLimit} with ${userPublicLists.total} public lists. Checking Polar benefits...`
                );
                const customer = await polar.customers.getExternal({
                    externalId: list.author
                });

                if (customer.id) {
                    console.log(`Fetching benefits for customer ID: ${customer.id}`);
                    const benefits = await polar.benefitGrants.list({
                        customerId: customer.id,
                        isGranted: true
                    });

                    const benefitNames = benefits.result.items.map((b) => b.benefit.description);

                    if (benefitNames.includes("Unlimited Public Lists")) {
                        publicListLimit = -1;
                    }
                }
            }

            log(
                `User ${list.author} has ${userPrivateLists.total} private lists and ${userPublicLists.total}/${publicListLimit}/${publicListLimit} public lists.`
            );

            console.log(`Processing list ID: ${list.$id}, private: ${list.private}`);

            if (!list.private) {
                console.log({
                    publicListLimit,
                    userPublicListsTotal: userPublicLists.total
                });
                if (publicListLimit !== -1 && userPublicLists.total > publicListLimit) {
                    // Update the list to be private, as the user has exceeded their public list limit
                    log(
                        `User ${list.author} has exceeded their public list limit of ${publicListLimit}. Making list ${list.$id} private.`
                    );
                    await tables.updateRow({
                        databaseId: process.env.APPWRITE_DATABASE,
                        tableId: process.env.APPWRITE_LIST_COLLECTION,
                        rowId: list.$id,
                        data: { private: true }
                    });
                    // Event will re-trigger and fix permissions
                    return res.json({
                        success: true,
                        message: `List ${list.$id} set to private due to public list limit exceeded.`
                    });
                }
            }

            console.log(`Processing list ID: ${list.$id}, private: ${list.private}`);

            if (!list.private) {
                console.log({
                    publicListLimit,
                    userPublicListsTotal: userPublicLists.total
                });
                if (publicListLimit !== -1 && userPublicLists.total > publicListLimit) {
                    // Update the list to be private, as the user has exceeded their public list limit
                    log(
                        `User ${list.author} has exceeded their public list limit of ${publicListLimit}. Making list ${list.$id} private.`
                    );
                    await tables.updateRow({
                        databaseId: process.env.APPWRITE_DATABASE,
                        tableId: process.env.APPWRITE_LIST_COLLECTION,
                        rowId: list.$id,
                        data: { private: true }
                    });
                    // Event will re-trigger and fix permissions
                    return res.json({
                        success: true,
                        message: `List ${list.$id} set to private due to public list limit exceeded.`
                    });
                }
            }

            if (list.private) {
                const ownerPermissions = [
                    Permission.read(Role.user(list.author)),
                    Permission.update(Role.user(list.author)),
                    Permission.delete(Role.user(list.author))
                ];

                const existingPermissions = list.$permissions || [];

                const combinedPermissions = [
                    ...new Set([...ownerPermissions, ...existingPermissions])
                ];

                if (combinedPermissions.length !== existingPermissions.length) {
                    await tables.updateRow({
                        databaseId: process.env.APPWRITE_DATABASE,
                        tableId: process.env.APPWRITE_LIST_COLLECTION,
                        rowId: list.$id,
                        permissions: ownerPermissions
                    });
                    log(`Updated permissions for private list: ${list.$id}`);
                } else {
                    log(`No permission changes needed for private list: ${list.$id}`);
                }

                const items = await tables.listRows({
                    databaseId: process.env.APPWRITE_DATABASE,
                    tableId: process.env.APPWRITE_ITEM_COLLECTION,
                    queries: [Query.equal("list", list.$id), Query.limit(500000)]
                });

                for (const item of items.rows) {
                    const existingItemPermissions = item.$permissions || [];

                    const combinedItemPermissions = [
                        ...new Set([...ownerPermissions, ...existingItemPermissions])
                    ];

                    if (combinedItemPermissions.length !== existingItemPermissions.length) {
                        await tables.updateRow({
                            databaseId: process.env.APPWRITE_DATABASE,
                            tableId: process.env.APPWRITE_ITEM_COLLECTION,
                            rowId: item.$id,
                            permissions: ownerPermissions
                        });
                        log(`Updated permissions for private item: ${item.$id}`);
                    } else {
                        log(`No permission changes needed for private item: ${item.$id}`);
                    }

                    if (item.imageID) {
                        try {
                            const image = await storage.getFile({
                                bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });

                            const existingImagePermissions = image.$permissions || [];

                            const combinedImagePermissions = [
                                ...new Set([...ownerPermissions, ...existingImagePermissions])
                            ];

                            if (
                                combinedImagePermissions.length !== existingImagePermissions.length
                            ) {
                                await storage.updateFile({
                                    bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                    fileId: item.imageID,
                                    permissions: ownerPermissions
                                });
                                log(
                                    `Updated permissions for private item image: ${item.imageID} (item: ${item.$id})`
                                );
                            }
                        } catch (err) {
                            error(
                                `Error updating image permissions for private item ${item.$id}: ${err.message}`
                            );
                        }
                    }
                }

                const communityItems = await tables.listRows({
                    databaseId: process.env.APPWRITE_DATABASE,
                    tableId: process.env.APPWRITE_ITEM_COLLECTION,
                    queries: [Query.equal("communityList", list.$id), Query.limit(500000)]
                });

                for (const item of communityItems.rows) {
                    if (item.imageID) {
                        log(`Deleting image ${item.imageID} for community item ${item.$id}`);
                        try {
                            await storage.deleteFile({
                                bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });
                        } catch (err) {
                            error(
                                `Error deleting image ${item.imageID} for community item ${item.$id}: ${err.message}`
                            );
                        }
                    }
                    await tables.deleteRow({
                        databaseId: process.env.APPWRITE_DATABASE,
                        tableId: process.env.APPWRITE_ITEM_COLLECTION,
                        rowId: item.$id
                    });

                    log(`Deleted community item: ${item.$id}`);
                }
            } else {
                const publicPermissions = [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(list.author)),
                    Permission.delete(Role.user(list.author))
                ];

                const existingPermissions = list.$permissions || [];

                const combinedPermissions = [
                    ...new Set([...publicPermissions, ...existingPermissions])
                ];

                if (combinedPermissions.length !== existingPermissions.length) {
                    await tables.updateRow({
                        databaseId: process.env.APPWRITE_DATABASE,
                        tableId: process.env.APPWRITE_LIST_COLLECTION,
                        rowId: list.$id,
                        permissions: publicPermissions
                    });
                    log(`Updated permissions for public list: ${list.$id}`);
                } else {
                    log(`No permission changes needed for public list: ${list.$id}`);
                }

                const items = await tables.listRows({
                    databaseId: process.env.APPWRITE_DATABASE,
                    tableId: process.env.APPWRITE_ITEM_COLLECTION,
                    queries: [Query.equal("list", list.$id), Query.limit(500000)]
                });

                for (const item of items.rows) {
                    const existingItemPermissions = item.$permissions || [];

                    const combinedItemPermissions = [
                        ...new Set([...publicPermissions, ...existingItemPermissions])
                    ];

                    if (combinedItemPermissions.length !== existingItemPermissions.length) {
                        await tables.updateRow({
                            databaseId: process.env.APPWRITE_DATABASE,
                            tableId: process.env.APPWRITE_ITEM_COLLECTION,
                            rowId: item.$id,
                            permissions: publicPermissions
                        });
                        log(`Updated permissions for public item: ${item.$id}`);
                    } else {
                        log(`No permission changes needed for public item: ${item.$id}`);
                    }

                    if (item.imageID) {
                        try {
                            const image = await storage.getFile({
                                bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });

                            const existingImagePermissions = image.$permissions || [];

                            const combinedImagePermissions = [
                                ...new Set([...publicPermissions, ...existingImagePermissions])
                            ];

                            if (
                                combinedImagePermissions.length !== existingImagePermissions.length
                            ) {
                                await storage.updateFile({
                                    bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                    fileId: item.imageID,
                                    permissions: publicPermissions
                                });
                                log(
                                    `Updated permissions for public item image: ${item.imageID} (item: ${item.$id})`
                                );
                            }
                        } catch (err) {
                            error(
                                `Error updating image permissions for public item ${item.$id}: ${err.message}`
                            );
                        }
                    }
                }
            }
        } catch (err) {
            error(`Failed to process event: ${err.message}`);
            return res.json({
                error: `Failed to process event: ${err.message}`
            });
        }
    }

    if (trigger === "event" && (eventType === "create" || eventType === "delete")) {
        try {
            await polar.events.ingest({
                events: [
                    {
                        name: "listDelta",
                        externalCustomerId: user,
                        metadata: {
                            delta: eventType === "delete" ? -1 : 1
                        }
                    }
                ]
            });
            log(`Successfully ingested event to Polar for user: ${user}`);
        } catch (err) {
            error(`Failed to ingest event to Polar: ${err.message}`);
            return res.json({
                error: `Failed to ingest event to Polar: ${err.message}`
            });
        }
    } else if (trigger === "http") {
        // Manual reconciliation
        const lists = await tables.listRows({
            databaseId: process.env.APPWRITE_DATABASE,
            tableId: process.env.APPWRITE_LIST_COLLECTION
        });

        for (const list of lists.rows) {
            if (list.private) {
                const ownerPermissions = [
                    Permission.read(Role.user(list.author)),
                    Permission.update(Role.user(list.author)),
                    Permission.delete(Role.user(list.author))
                ];

                const existingPermissions = list.$permissions || [];

                const combinedPermissions = [
                    ...new Set([...ownerPermissions, ...existingPermissions])
                ];

                if (combinedPermissions.length !== existingPermissions.length) {
                    if (!dryRun)
                        await tables.updateRow({
                            databaseId: process.env.APPWRITE_DATABASE,
                            tableId: process.env.APPWRITE_LIST_COLLECTION,
                            rowId: list.$id,
                            permissions: ownerPermissions
                        });
                    log(
                        `Updated permissions for private list: ${list.$id}${dryRun ? " (dry run)" : ""}`
                    );
                }
            } else {
                const publicPermissions = [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(list.author)),
                    Permission.delete(Role.user(list.author))
                ];

                const existingPermissions = list.$permissions || [];

                const combinedPermissions = [
                    ...new Set([...publicPermissions, ...existingPermissions])
                ];

                if (combinedPermissions.length !== existingPermissions.length) {
                    if (!dryRun)
                        await tables.updateRow({
                            databaseId: process.env.APPWRITE_DATABASE,
                            tableId: process.env.APPWRITE_LIST_COLLECTION,
                            rowId: list.$id,
                            permissions: publicPermissions
                        });
                    log(
                        `Updated permissions for public list: ${list.$id}${dryRun ? " (dry run)" : ""}`
                    );
                }
            }
        }

        const items = await tables.listRows({
            databaseId: process.env.APPWRITE_DATABASE,
            tableId: process.env.APPWRITE_ITEM_COLLECTION,
            queries: [Query.limit(500000), Query.select(["*", "list.*"])]
        });

        for (const item of items.rows) {
            if (item.communityList) {
                const communityPermissions = [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(item.contributorId)),
                    Permission.delete(Role.user(item.contributorId))
                ];

                const existingPermissions = item.$permissions || [];

                const combinedPermissions = [
                    ...new Set([...communityPermissions, ...existingPermissions])
                ];

                if (combinedPermissions.length !== existingPermissions.length) {
                    if (!dryRun)
                        await tables.updateRow({
                            databaseId: process.env.APPWRITE_DATABASE,
                            tableId: process.env.APPWRITE_ITEM_COLLECTION,
                            rowId: item.$id,
                            permissions: communityPermissions
                        });
                    log(
                        `Updated permissions for community item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                    );
                }

                if (item.imageID) {
                    try {
                        const image = await storage.getFile({
                            bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                            fileId: item.imageID
                        });

                        const existingImagePermissions = image.$permissions || [];

                        const combinedImagePermissions = [
                            ...new Set([...communityPermissions, ...existingImagePermissions])
                        ];

                        if (combinedImagePermissions.length !== existingImagePermissions.length) {
                            if (!dryRun)
                                await storage.updateFile({
                                    bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                    fileId: item.imageID,
                                    permissions: communityPermissions
                                });
                            log(
                                `Updated permissions for community item image: ${item.imageID} (item: ${item.$id})${dryRun ? " (dry run)" : ""}`
                            );
                        }
                    } catch (err) {
                        error(
                            `Error fetching image for community item ${item.$id}: ${err.message}`
                        );
                        if (!dryRun)
                            await tables.updateRow({
                                databaseId: process.env.APPWRITE_DATABASE,
                                tableId: process.env.APPWRITE_ITEM_COLLECTION,
                                rowId: item.$id,
                                data: { imageID: null }
                            });
                        log(
                            `Cleared missing imageID for community item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                        );
                    }
                }
            } else {
                if (!item.list) {
                    log(`Item ${item.$id} has no associated list. Skipping...`);
                    continue;
                }
                if (item.list.private) {
                    const ownerPermissions = [
                        Permission.read(Role.user(item.list.author)),
                        Permission.update(Role.user(item.list.author)),
                        Permission.delete(Role.user(item.list.author))
                    ];

                    const existingPermissions = item.$permissions || [];

                    const combinedPermissions = [
                        ...new Set([...ownerPermissions, ...existingPermissions])
                    ];

                    if (combinedPermissions.length !== existingPermissions.length) {
                        if (!dryRun)
                            await tables.updateRow({
                                databaseId: process.env.APPWRITE_DATABASE,
                                tableId: process.env.APPWRITE_ITEM_COLLECTION,
                                rowId: item.$id,
                                permissions: ownerPermissions
                            });
                        log(
                            `Updated permissions for private item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                        );
                    }

                    if (item.imageID) {
                        try {
                            const image = await storage.getFile({
                                bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });

                            const existingImagePermissions = image.$permissions || [];

                            const combinedImagePermissions = [
                                ...new Set([...ownerPermissions, ...existingImagePermissions])
                            ];

                            if (
                                combinedImagePermissions.length !== existingImagePermissions.length
                            ) {
                                if (!dryRun)
                                    await storage.updateFile({
                                        bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                        fileId: item.imageID,
                                        permissions: ownerPermissions
                                    });
                                log(
                                    `Updated permissions for private item image: ${item.imageID} (item: ${item.$id})${dryRun ? " (dry run)" : ""}`
                                );
                            }
                        } catch (error) {
                            error(
                                `Error fetching image for private item ${item.$id}: ${error.message}`
                            );
                            if (!dryRun)
                                await tables.updateRow({
                                    databaseId: process.env.APPWRITE_DATABASE,
                                    tableId: process.env.APPWRITE_ITEM_COLLECTION,
                                    rowId: item.$id,
                                    data: { imageID: null }
                                });
                            log(
                                `Cleared missing imageID for private item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                            );
                        }
                    }
                } else {
                    const publicPermissions = [
                        Permission.read(Role.any()),
                        Permission.update(Role.user(item.list.author)),
                        Permission.delete(Role.user(item.list.author))
                    ];

                    const existingPermissions = item.$permissions || [];

                    const combinedPermissions = [
                        ...new Set([...publicPermissions, ...existingPermissions])
                    ];

                    if (combinedPermissions.length !== existingPermissions.length) {
                        if (!dryRun)
                            await tables.updateRow({
                                databaseId: process.env.APPWRITE_DATABASE,
                                tableId: process.env.APPWRITE_ITEM_COLLECTION,
                                rowId: item.$id,
                                permissions: publicPermissions
                            });
                        log(
                            `Updated permissions for public item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                        );
                    }

                    if (item.imageID) {
                        try {
                            const image = await storage.getFile({
                                bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });

                            const existingImagePermissions = image.$permissions || [];

                            const combinedImagePermissions = [
                                ...new Set([...publicPermissions, ...existingImagePermissions])
                            ];

                            if (
                                combinedImagePermissions.length !== existingImagePermissions.length
                            ) {
                                if (!dryRun)
                                    await storage.updateFile({
                                        bucketId: process.env.APPWRITE_IMAGE_BUCKET,
                                        fileId: item.imageID,
                                        permissions: publicPermissions
                                    });
                                log(
                                    `Updated permissions for public item image: ${item.imageID} (item: ${item.$id})${dryRun ? " (dry run)" : ""}`
                                );
                            }
                        } catch (err) {
                            error(
                                `Error fetching image for public item ${item.$id}: ${err.message}`
                            );
                            if (!dryRun)
                                await tables.updateRow({
                                    databaseId: process.env.APPWRITE_DATABASE,
                                    tableId: process.env.APPWRITE_ITEM_COLLECTION,
                                    rowId: item.$id,
                                    data: { imageID: null }
                                });
                            log(
                                `Cleared missing imageID for public item: ${item.$id}${dryRun ? " (dry run)" : ""}`
                            );
                        }
                    }
                }
            }
        }
    }

    log("Function execution completed successfully.");

    return res.json({
        success: true
    });
};