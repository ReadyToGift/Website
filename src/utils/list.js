import { APPWRITE_DB, APPWRITE_FULFILLMENT_COLLECTION, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { Permission, Query, Role } from "appwrite";

export const load = async ({
    tablesDB,
    listId,
    sort = "price",
    user
}) => {
    let list = await tablesDB.getRow({
        databaseId: APPWRITE_DB,
        tableId: APPWRITE_LIST_COLLECTION,
        rowId: listId,
        queries: [
            Query.select(["*","items.*"])
        ]
    });

    if (import.meta.env.SSR) {
        const readAny = list.$permissions.includes(Permission.read(Role.any()));
        const readUser = user && list.$permissions.includes(Permission.read(Role.user(user.$id)));
    
        if (!readAny && !readUser) {
            throw new Error({ code: 404, message: "List not found" });
        }
    }


    const communityItems = (await tablesDB.listRows({
        databaseId: APPWRITE_DB,
        tableId: APPWRITE_ITEM_COLLECTION,
        queries: [
            Query.equal("communityList", list.$id)
        ]
    })).rows;

    const loadedAsAuthor = user && list.author === user.$id;

    let fulfillments = [];

    if (list.items && list.items.length) {
        fulfillments = (await tablesDB.listRows({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_FULFILLMENT_COLLECTION,
            queries: [
                Query.equal("item", list.items.map((item) => item.$id)),
                Query.select(["*", "item.*"]),
                Query.limit(list.items.length)
            ]
        })).rows;
    }

    list.items = list.items
        .sort((a, b) => {
            if (sort === "price") {
                return a.price - b.price;
            }
            return a.title.localeCompare(b.title);
        })
        .map((item) => {
            item.fulfillment = fulfillments.find(
                (fulfillment) => {
                    return fulfillment.item.$id === item.$id;
                }
            );

            return item;
        });

    return {
        list,
        loadedAsAuthor,
        fulfillments,
        communityItems
    };
};