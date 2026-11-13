import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fulfillments, items, lists } from "@/schema";

export const prerender = false;

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

const getItem = async (itemId) => {
    const [item] = await db
        .select({
            id: items.id,
            communityList: items.communityList,
            listAuthor: lists.author,
            listPrivate: lists.private,
        })
        .from(items)
        .leftJoin(lists, eq(lists.id, items.list))
        .where(eq(items.id, itemId));
    return item;
};

export const POST = async (context) => {
    try {
        const user = context.locals.user;
        const { itemId, name } = await context.request.json();
        if (!itemId || typeof itemId !== "string") {
            return json({ message: "Invalid item ID" }, 400);
        }

        const item = await getItem(itemId);
        if (!item) return json({ message: "Item not found" }, 404);
        if (item.communityList) {
            return json(
                { message: "Community items cannot be fulfilled" },
                400,
            );
        }
        if (item.listPrivate && (!user || item.listAuthor !== user.id)) {
            return json({ message: "Unauthorized" }, 403);
        }
        if (user && item.listAuthor === user.id) {
            return json(
                { message: "List owners cannot fulfill their own items" },
                403,
            );
        }

        const [existing] = await db
            .select({ id: fulfillments.id })
            .from(fulfillments)
            .where(eq(fulfillments.item, itemId));
        if (existing) {
            return json(
                {
                    message:
                        "This item is already fulfilled. Please refresh the page.",
                },
                409,
            );
        }

        const [fulfillment] = await db
            .insert(fulfillments)
            .values({ item: itemId, name: name || "" })
            .returning();

        return json({ fulfillment });
    } catch (error) {
        console.error(error);
        return json({ message: "Internal server error" }, 500);
    }
};

export const DELETE = async (context) => {
    try {
        const user = context.locals.user;
        const { fulfillmentId, itemId } = await context.request.json();
        let fulfillment;

        if (fulfillmentId) {
            [fulfillment] = await db
                .select({
                    id: fulfillments.id,
                    itemId: fulfillments.item,
                    listAuthor: lists.author,
                    listPrivate: lists.private,
                })
                .from(fulfillments)
                .leftJoin(items, eq(items.id, fulfillments.item))
                .leftJoin(lists, eq(lists.id, items.list))
                .where(eq(fulfillments.id, fulfillmentId));
        } else if (itemId) {
            [fulfillment] = await db
                .select({
                    id: fulfillments.id,
                    itemId: fulfillments.item,
                    listAuthor: lists.author,
                    listPrivate: lists.private,
                })
                .from(fulfillments)
                .leftJoin(items, eq(items.id, fulfillments.item))
                .leftJoin(lists, eq(lists.id, items.list))
                .where(eq(fulfillments.item, itemId));
        }

        if (!fulfillment)
            return json({ message: "Fulfillment not found" }, 404);
        if (
            fulfillment.listPrivate &&
            (!user || fulfillment.listAuthor !== user.id)
        ) {
            return json({ message: "Unauthorized" }, 403);
        }

        await db
            .delete(fulfillments)
            .where(eq(fulfillments.id, fulfillment.id));

        return json({ message: "Item unfulfilled successfully" });
    } catch (error) {
        console.error(error);
        return json({ message: "Internal server error" }, 500);
    }
};
