import { APPWRITE_DB, APPWRITE_FULFILLMENT_COLLECTION, APPWRITE_ITEM_COLLECTION } from "astro:env/client";
import { appwriteErrorResponse, createAdminClient, createSessionClient } from "@/server/appwrite";
import { Query } from "node-appwrite";

const getOptionalAccount = async (request) => {
    try {
        const sessionClient = createSessionClient({ request });
        return await sessionClient.account.get();
    } catch {
        return null;
    }
};

export const POST = async (context) => {
    try {
        const account = await getOptionalAccount(context.request);
        const { itemId, name } = await context.request.json();

        if (!itemId || typeof itemId !== "string") {
            return new Response(JSON.stringify({ message: "Invalid item ID" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        let adminClient;
        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.log(err);
            return new Response(JSON.stringify({ message: "Error creating admin client" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
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
            return new Response(JSON.stringify({ message: "Error fetching item" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!item) {
            return new Response(JSON.stringify({ message: "Item not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (item.communityList) {
            return new Response(JSON.stringify({ message: "Community items cannot be fulfilled" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const list = item.list;

        if (list?.private && (!account || list.author !== account.$id)) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (account && list?.author === account.$id) {
            return new Response(JSON.stringify({ message: "List owners cannot fulfill their own items" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        const existing = await adminClient.tablesDB.listRows({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            queries: [Query.equal("item", itemId), Query.limit(1)]
        });

        if (existing.total > 0) {
            return new Response(JSON.stringify({ message: "This item is already fulfilled. Please refresh the page." }), {
                status: 409,
                headers: { "Content-Type": "application/json" }
            });
        }

        const created = await adminClient.tablesDB.createRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            rowId: "unique()",
            data: {
                item: itemId,
                name: name || null
            }
        });

        const fulfillment = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            rowId: created.$id,
            queries: [Query.select(["*", "item.*"])]
        });

        return new Response(JSON.stringify({ fulfillment }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.log(err);
        const resp = appwriteErrorResponse(err, "Appwrite backend is unavailable");
        if (resp) return resp;
        return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const DELETE = async (context) => {
    try {
        const account = await getOptionalAccount(context.request);
        const { fulfillmentId, itemId } = await context.request.json();

        let adminClient;
        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.log(err);
            return new Response(JSON.stringify({ message: "Error creating admin client" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        let targetFulfillmentId = fulfillmentId;

        if (!targetFulfillmentId && itemId) {
            const existing = await adminClient.tablesDB.listRows({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_FULFILLMENT_COLLECTION,
                queries: [Query.equal("item", itemId), Query.limit(1)]
            });

            targetFulfillmentId = existing.rows?.[0]?.$id;
        }

        if (!targetFulfillmentId) {
            return new Response(JSON.stringify({ message: "Fulfillment not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const fulfillment = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            rowId: targetFulfillmentId,
            queries: [Query.select(["*", "item.*", "item.list.*"])]
        });

        if (!fulfillment) {
            return new Response(JSON.stringify({ message: "Fulfillment not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const list = fulfillment.item?.list;

        if (list?.private && (!account || list.author !== account.$id)) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        await adminClient.tablesDB.deleteRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            rowId: targetFulfillmentId
        });

        return new Response(JSON.stringify({ message: "Item unfulfilled successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.log(err);
        const resp = appwriteErrorResponse(err, "Appwrite backend is unavailable");
        if (resp) return resp;
        return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
