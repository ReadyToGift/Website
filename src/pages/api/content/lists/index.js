import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, Permission, Query, Role } from "node-appwrite";
import { createAdminClient, requireAuth } from "@/server/appwrite";
import { getUserLimits } from "@/server/billing";

const getListUsage = async ({ account, adminClient }) => {
    const { limits } = await getUserLimits({ account, adminClient });

    let userLists;

    try {
        const listsResp = await adminClient.tablesDB.listRows({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_LIST_COLLECTION,
            queries: [
                Query.equal("author", account.$id)
            ]
        });

        userLists = listsResp.rows;
    } catch (err) {
        console.log(err);

        return new Response(
            JSON.stringify({
                message: "Error getting user lists"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    const publicListCount = userLists.filter(list => !list.private).length;
    const privateListCount = userLists.filter(list => list.private).length;

    return { limits, publicListCount, privateListCount };
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
        
        let adminClient;

        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error creating admin client"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const { currency, description, private: isPrivate, shortUrl, title } = await context.request.json();

        let limits, publicListCount, privateListCount;
        try {
            const userLimitsResp = await getListUsage({ account, adminClient });
            limits = userLimitsResp.limits;
            publicListCount = userLimitsResp.publicListCount;
            privateListCount = userLimitsResp.privateListCount;
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error getting user limits"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!isPrivate && limits.publicLists !== -1 && publicListCount >= limits.publicLists) {
            return new Response(
                JSON.stringify({
                    message: "Public list limit reached"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (isPrivate && limits.privateLists !== -1 && privateListCount >= limits.privateLists) {
            return new Response(
                JSON.stringify({
                    message: "Private list limit reached"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        console.log(`User has ${publicListCount} public lists and ${privateListCount} private lists`);

        if (shortUrl) {
            try {
                const conflictingDocuments = await adminClient.tablesDB.listRows({
                    databaseId: APPWRITE_DB,
                    tableId: APPWRITE_LIST_COLLECTION,
                    queries: [
                        Query.equal("shortUrl", shortUrl)
                    ]
                });
        
                if (conflictingDocuments.total > 0) {
                    return new Response(
                        JSON.stringify({
                            message: "Short URL already in use"
                        }),
                        {
                            status: 400,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );
                }
            } catch (err) {
                if (err instanceof AppwriteException) {
                    return new Response(
                        JSON.stringify({
                            message: err.message
                        }),
                        {
                            status: err.code || 500,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );
                }
                return new Response(
                    JSON.stringify({
                        message: "Error checking for conflicting short URL"
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }
        }

        let permissions = [
            Permission.write(Role.user(account.$id)),
            Permission.delete(Role.user(account.$id)),
            Permission.update(Role.user(account.$id))
        ];

        if (isPrivate) {
            permissions.push(Permission.read(Role.user(account.$id)));
        } else {
            permissions.push(Permission.read(Role.any()));
        }

        let newList;

        try {
            newList = await adminClient.tablesDB.createRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: "unique()",
                data: {
                    currency,
                    description,
                    private: isPrivate,
                    shortUrl,
                    title,
                    authorName: account.name || account.email,
                    author: account.$id,
                    itemCount: 0
                },
                permissions
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error creating list"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                list: newList
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.log(err);

        return new Response(
            JSON.stringify({
                message: "Internal server error"
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

export const DELETE = async (context) => {
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

        const { listId } = await context.request.json();

        let adminClient;

        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error creating admin client"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const list = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_LIST_COLLECTION,
            rowId: listId,
            queries: [Query.select(["*", "items.*"])]
        });

        if (!list) {
            return new Response(
                JSON.stringify({
                    message: "List not found"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (list.author !== account.$id) {
            return new Response(
                JSON.stringify({
                    message: "Unauthorized"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        list.items.map(async (item) => {
            if (item.imageID) {
                try {
                    await adminClient.storage.deleteFile({
                        bucketId: APPWRITE_IMAGE_BUCKET,
                        fileId: item.imageID
                    });
                } catch (err) {
                    console.log(err);
                }
            }
            // List <=> Items are set to cascade delete in Appwrite console
        });

        let communityItems;

        try {
            const communityItemsResp = await adminClient.tablesDB.listRows({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_ITEM_COLLECTION,
                queries: [
                    Query.equal("communityList", listId)
                ]
            });

            communityItems = communityItemsResp.rows;
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error getting community items"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        communityItems.map(async (item) => {
            try {
                if (item.imageID) {
                    await adminClient.storage.deleteFile({
                        bucketId: APPWRITE_IMAGE_BUCKET,
                        fileId: item.imageID
                    });

                    console.log(`Deleted community item image ${item.imageID}`);
                }
            } catch (err) {
                console.log(err);
            }
        });

        try {
            await adminClient.tablesDB.deleteRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: listId
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error deleting list"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                message: "List deleted successfully"
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.log(err);

        return new Response(
            JSON.stringify({
                message: "Internal server error"
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

export const PUT = async (context) => {
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

        const { listId, updateData } = await context.request.json();
        let adminClient;

        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error creating admin client"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        } 

        if (updateData.shortUrl) {
            try {
                const conflictingDocuments = await adminClient.tablesDB.listRows({
                    databaseId: APPWRITE_DB,
                    tableId: APPWRITE_LIST_COLLECTION,
                    queries: [
                        Query.equal("shortUrl", updateData.shortUrl),
                        Query.notEqual("$id", listId)
                    ]
                });

                if (conflictingDocuments.total > 0) {
                    return new Response(
                        JSON.stringify({
                            message: "Short URL already in use"
                        }),
                        {
                            status: 400,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );
                }
            } catch (err) {
                if (err instanceof AppwriteException) {
                    return new Response(
                        JSON.stringify({
                            message: err.message
                        }),
                        {
                            status: err.code || 500,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );
                }
                return new Response(
                    JSON.stringify({
                        message: "Error checking for conflicting short URL"
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }
        }

        let list;

        try {
            list = await adminClient.tablesDB.getRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: listId,
                queries: [Query.select(["*", "items.*"])]
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error fetching list"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!list) {
            return new Response(
                JSON.stringify({
                    message: "List not found"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (list.author !== account.$id) {
            return new Response(
                JSON.stringify({
                    message: "Unauthorized"
                }),
                {
                    status: 403,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const updatingToPrivate = updateData.private === true && list.private === false;
        const updatingToPublic = updateData.private === false && list.private === true;

        if (updatingToPrivate || updatingToPublic) {
            let userLimits;

            try {
                userLimits = await getUserLimits({ account, adminClient });
            } catch (err) {
                console.log(err);

                return new Response(
                    JSON.stringify({
                        message: "Error getting user limits"
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            const limits = userLimits.limits;
            const publicListCount = userLimits.publicListCount;
            const privateListCount = userLimits.privateListCount;

            if (updatingToPrivate && limits.privateLists !== -1 && privateListCount >= limits.privateLists) {
                return new Response(
                    JSON.stringify({
                        message: "Private list limit reached"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            if (updatingToPublic && limits.publicLists !== -1 && publicListCount >= limits.publicLists) {
                return new Response(
                    JSON.stringify({
                        message: "Public list limit reached"
                    }),
                    {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                );
            }

            if (updatingToPrivate) {
                let communityItems;

                try {
                    const communityItemsResp = await adminClient.tablesDB.listRows({
                        databaseId: APPWRITE_DB,
                        tableId: APPWRITE_ITEM_COLLECTION,
                        queries: [
                            Query.equal("communityList", listId)
                        ]
                    });

                    communityItems = communityItemsResp.rows;
                } catch (err) {
                    console.log(err);

                    return new Response(
                        JSON.stringify({
                            message: "Error getting community items"
                        }),
                        {
                            status: 500,
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );
                }

                communityItems.map(async (item) => {
                    try {
                        if (item.imageID) {
                            await adminClient.storage.deleteFile({
                                bucketId: APPWRITE_IMAGE_BUCKET,
                                fileId: item.imageID
                            });

                            console.log(`Deleted community item image ${item.imageID}`);
                        }
                        await adminClient.tablesDB.deleteRow({
                            databaseId: APPWRITE_DB,
                            tableId: APPWRITE_ITEM_COLLECTION,
                            rowId: item.$id
                        });

                        console.log(`Deleted community item ${item.$id}`);
                    } catch (err) {
                        console.log(err);
                    }
                });
            }
        }

        let permissions = [
            Permission.write(Role.user(account.$id)),
            Permission.delete(Role.user(account.$id)),
            Permission.update(Role.user(account.$id))
        ];

        if (updateData.private) {
            permissions.push(Permission.read(Role.user(account.$id)));
        } else {
            permissions.push(Permission.read(Role.any()));
        }


        if (updatingToPrivate || updatingToPublic) {
            list.items.map(async (item) => {
                if (item.imageID) {
                    try {
                        await adminClient.storage.updateFile({
                            bucketId: APPWRITE_IMAGE_BUCKET,
                            fileId: item.imageID,
                            permissions
                        });

                        console.log(`Updated permissions for image ${item.imageID}`);
                    } catch (err) {
                        console.log(err);
                    }
                }

                try {
                    await adminClient.tablesDB.updateRow({
                        databaseId: APPWRITE_DB,
                        tableId: APPWRITE_ITEM_COLLECTION,
                        rowId: item.$id,
                        data: {},
                        permissions
                    });

                    console.log(`Updated permissions for item ${item.$id}`);
                } catch (err) {
                    console.log(err);
                }
            });
        }

        let updatedList;

        try {
            updatedList = await adminClient.tablesDB.updateRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: listId,
                data: updateData,
                permissions
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error updating list"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({
                message: "List updated successfully",
                list: updatedList
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        console.log(err);

        return new Response(
            JSON.stringify({
                message: "Internal server error"
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