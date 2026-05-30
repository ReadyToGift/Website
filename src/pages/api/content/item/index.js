import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
export const prerender = false;
import { createAdminClient, requireAuth } from "@/server/appwrite";
import { Permission, Query, Role } from "node-appwrite";
import { getUserLimits } from "@/server/billing";

const updateItemCount = async ({ adminClient, listId, itemCount = null }) => {
    if (!listId || typeof listId !== "string") {
        return;
    }

    if (itemCount === null) {
        const list = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_LIST_COLLECTION,
            rowId: listId,
            queries: [Query.select(["*", "items.*"])]
        });

        itemCount = list.items?.filter((item) => !item.communityList).length ?? 0;
    }

    await adminClient.tablesDB.updateRow({
        databaseId: APPWRITE_DB,
        tableId: APPWRITE_LIST_COLLECTION,
        rowId: listId,
        data: { itemCount }
    });
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

        const { itemData } = await context.request.json();
        const { communityList, contributorId, contributorName, description, displayPrice, image, imageID, list: listId, price, priority, title, url } = itemData;

        const isCommunityItem = communityList && contributorId && contributorName;

        let limits;
        if (!isCommunityItem) {
            try {
                const userLimitsResp = await getUserLimits({ account });
                limits = userLimitsResp.limits;
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

        if (!isCommunityItem) {
            if (list.items.length >= limits.itemsPerList && limits.itemsPerList !== -1) {
                return new Response(
                    JSON.stringify({
                        message: "Item limit for list reached"
                    }),
                    {
                        status: 400,
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

        if (list.private) {
            permissions.push(Permission.read(Role.user(account.$id)));
        } else {
            permissions.push(Permission.read(Role.any()));
        }

        let newItem;

        try {
            newItem = await adminClient.tablesDB.createRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_ITEM_COLLECTION,
                rowId: "unique()",
                data: {
                    communityList,
                    contributorId,
                    contributorName,
                    description,
                    displayPrice,
                    image,
                    imageID,
                    list: listId,
                    price, priority,
                    title,
                    url
                },
                permissions
            });

            if (!isCommunityItem) {
                const newCount = list.items.length + 1;
                await updateItemCount({ adminClient, listId, itemCount: newCount });
            }
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error creating item"
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
                item: newItem
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

        const { itemId } = await context.request.json();

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

        const item = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_ITEM_COLLECTION,
            rowId: itemId,
            queries: [Query.select(["*", "list.*", "communityList.*"])]
        });

        if (!item) {
            return new Response(
                JSON.stringify({
                    message: "Item not found"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const communityItem = item.communityList && item.contributorId && item.contributorName;

        const isCommunityitemContributor = communityItem && item.contributorId === account.$id;
        const isListAuthor = !communityItem && item.list.author === account.$id;


        if (!isCommunityitemContributor && !isListAuthor) {
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

        if (item.imageID) {
            try {
                await adminClient.storage.deleteFile({
                    bucketId: APPWRITE_IMAGE_BUCKET,
                    fileId: item.imageID
                });

                console.log(`Deleted image with ID ${item.imageID} for item ${itemId}`);
            } catch (err) {
                console.log(err);
            }
        }

        try {
            await adminClient.tablesDB.deleteRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_ITEM_COLLECTION,
                rowId: itemId
            });

            const listId = item.list?.$id || item.list;

            if (!communityItem && listId) {
                await updateItemCount({ adminClient, listId });
            }
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error deleting item"
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
                message: "Item deleted successfully"
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

        const { itemId, updateData } = await context.request.json();

        if (!itemId || typeof itemId !== "string") {
            return new Response(
                JSON.stringify({
                    message: "Invalid item ID"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
            return new Response(
                JSON.stringify({
                    message: "Invalid update data"
                }),
                {
                    status: 400,
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

        let item;

        try {
            item = await adminClient.tablesDB.getRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_ITEM_COLLECTION,
                rowId: itemId,
                queries: [Query.select(["*", "list.*"])]
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error fetching item"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!item) {
            return new Response(
                JSON.stringify({
                    message: "Item not found"
                }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const communityItem = item.communityList && item.contributorId && item.contributorName;

        const isCommunityitemContributor = communityItem && item.contributorId === account.$id;
        const isListAuthor = !communityItem && item.list?.author === account.$id;

        if (!isCommunityitemContributor && !isListAuthor) {
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

        if (communityItem && updateData.list && updateData.list !== (item.list?.$id || item.list)) {
            return new Response(
                JSON.stringify({
                    message: "Community items cannot be moved between lists"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let list;

        const previousListId = item.list?.$id || item.list;
        const targetListId = updateData.list || item.list?.$id || item.list;
        const movingToDifferentList = !communityItem && !!updateData.list && targetListId !== previousListId;

        try {
            list = await adminClient.tablesDB.getRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                rowId: targetListId,
                queries: [Query.select(["private", "author", "itemCount"])]
            });
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error fetching item list"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!communityItem && list.author !== account.$id) {
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

        if (movingToDifferentList) {
            let userLimitsResp;

            try {
                userLimitsResp = await getUserLimits({ account });
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

            const { limits } = userLimitsResp;
            const targetItemCount = list.itemCount ?? 0;

            if (limits.itemsPerList !== -1 && targetItemCount >= limits.itemsPerList) {
                return new Response(
                    JSON.stringify({
                        message: "Item limit for list reached"
                    }),
                    {
                        status: 400,
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

        if (list.private) {
            permissions.push(Permission.read(Role.user(account.$id)));
        } else {
            permissions.push(Permission.read(Role.any()));
        }

        const differentImage = !!updateData.imageID && updateData.imageID !== item.imageID;
        const removedImage = updateData.imageID === null && !!item.imageID;

        if ((differentImage || removedImage) && item.imageID) {
            try {
                await adminClient.storage.deleteFile({
                    bucketId: APPWRITE_IMAGE_BUCKET,
                    fileId: item.imageID
                });

                console.log(`Deleted old image with ID ${item.imageID} for item ${itemId}`);
            } catch (err) {
                console.log(err);
            }
        }

        let updatedItem;

        try {
            updatedItem = await adminClient.tablesDB.updateRow({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_ITEM_COLLECTION,
                rowId: itemId,
                data: updateData,
                permissions
            });

            if (movingToDifferentList) {
                await Promise.all([
                    updateItemCount({ adminClient, listId: previousListId }),
                    updateItemCount({ adminClient, listId: targetListId })
                ]);
            }
        } catch (err) {
            console.log(err);

            return new Response(
                JSON.stringify({
                    message: "Error updating item"
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
                message: "Item updated successfully",
                item: updatedItem
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