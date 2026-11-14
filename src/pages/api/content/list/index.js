import { and, count, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { requireAuth } from "@/auth";
import { user as users } from "@/auth-schema";
import { db } from "@/db";
import { fulfillments, items, lists } from "@/schema";
import { getUserLimits } from "@/server/billing";
import { bucket } from "@/storage";

export const prerender = false;

const getListUsage = async ({ user }) => {
    const userID = user.id;
    const { limits } = await getUserLimits({
        user,
    });

    const userLists = await db
        .select({ private: lists.private })
        .from(lists)
        .where(eq(lists.author, userID));

    return {
        limits,
        publicListCount: userLists.filter((list) => !list.private).length,
        privateListCount: userLists.filter((list) => list.private).length,
    };
};

export const GET = async (context) => {
    try {
        const user = context.locals.user;

        const searchParams = context.url.searchParams;
        const listID = searchParams.get("listId");
        const sort = searchParams.get("sort") || "price";

        if (!listID) {
            return new Response(
                JSON.stringify({
                    message: "Missing list ID",
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const listRows = await db
            .select({
                id: lists.id,
                author: users.id,
                authorName: users.name,
                title: lists.title,
                description: lists.description,
                currency: lists.currency,
                shortUrl: lists.shortUrl,
                private: lists.private,
                spoilSurprises: lists.spoilSurprises,
                createdAt: lists.createdAt,
                updatedAt: lists.updatedAt,
                itemCount: count(items.id),
            })
            .from(lists)
            .leftJoin(users, eq(users.id, lists.author))
            .leftJoin(
                items,
                and(eq(items.list, lists.id), isNull(items.communityList)),
            )
            .where(eq(lists.id, listID))
            .groupBy(lists.id, users.id, users.name);

        if (!listRows.length) {
            return new Response(JSON.stringify({ message: "List not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const list = listRows[0];

        if (list.private && list.author !== user?.id) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const listItems = await db
            .select()
            .from(items)
            .where(and(eq(items.list, listID), isNull(items.communityList)));

        const communityItems = await db
            .select()
            .from(items)
            .where(eq(items.communityList, listID));

        const contributorIDs = [
            ...new Set(
                [...listItems, ...communityItems]
                    .map((item) => item.contributor)
                    .filter(Boolean),
            ),
        ];
        const contributorRows = contributorIDs.length
            ? await db
                  .select({ id: users.id, name: users.name })
                  .from(users)
                  .where(inArray(users.id, contributorIDs))
            : [];
        const contributorNames = new Map(
            contributorRows.map((contributor) => [
                contributor.id,
                contributor.name,
            ]),
        );
        const formatItem = (item) => ({
            ...item,
            contributorId: item.contributor,
            contributorName: contributorNames.get(item.contributor) || null,
        });

        const itemIDs = listItems.map((item) => item.id);
        const fulfillmentRows = itemIDs.length
            ? await db
                  .select()
                  .from(fulfillments)
                  .where(inArray(fulfillments.item, itemIDs))
            : [];

        list.items = listItems
            .sort((a, b) => {
                if (sort === "price") {
                    return (a.price ?? 0) - (b.price ?? 0);
                }

                return a.title.localeCompare(b.title);
            })
            .map((item) => {
                return {
                    ...formatItem(item),
                    fulfillment:
                        fulfillmentRows.find(
                            (fulfillment) => fulfillment.item === item.id,
                        ) || null,
                };
            });

        return new Response(
            JSON.stringify({
                list,
                loadedAsAuthor: list.author === user?.id,
                fulfillments: fulfillmentRows,
                communityItems: communityItems.map(formatItem),
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (err) {
        console.log(err);

        return new Response(
            JSON.stringify({
                message: "Internal server error",
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
    }
};

export const POST = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const {
            currency = "USD",
            description = null,
            private: isPrivate = false,
            shortUrl = null,
            spoilSurprises = false,
            title,
        } = await context.request.json();

        if (typeof title !== "string" || !title.trim()) {
            return new Response(
                JSON.stringify({ message: "Title is required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const usage = await getListUsage({ user });
        const limit = isPrivate
            ? usage.limits.privateLists
            : usage.limits.publicLists;
        const count = isPrivate
            ? usage.privateListCount
            : usage.publicListCount;

        if (limit !== -1 && count >= limit) {
            return new Response(
                JSON.stringify({
                    message: isPrivate
                        ? "Private list limit reached"
                        : "Public list limit reached",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        if (shortUrl) {
            const conflicts = await db
                .select({ id: lists.id })
                .from(lists)
                .where(eq(lists.shortUrl, shortUrl));

            if (conflicts.length) {
                return new Response(
                    JSON.stringify({ message: "Short URL already in use" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }
        }

        const [newList] = await db
            .insert(lists)
            .values({
                author: user.id,
                currency,
                description,
                private: Boolean(isPrivate),
                shortUrl,
                spoilSurprises: spoilSurprises === true,
                title: title.trim(),
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return new Response(JSON.stringify({ list: newList }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error creating list", error);
        return new Response(
            JSON.stringify({ message: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};

export const DELETE = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { listId } = await context.request.json();
        if (!listId || typeof listId !== "string") {
            return new Response(
                JSON.stringify({ message: "Invalid list ID" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const listRows = await db
            .select({ id: lists.id, author: lists.author })
            .from(lists)
            .where(eq(lists.id, listId));

        if (!listRows.length) {
            return new Response(JSON.stringify({ message: "List not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (listRows[0].author !== user.id) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const imageRows = await db
            .select({ imageID: items.imageID })
            .from(items)
            .where(or(eq(items.list, listId), eq(items.communityList, listId)));

        await db.delete(lists).where(eq(lists.id, listId)).run();

        await Promise.all(
            imageRows
                .map((row) => row.imageID)
                .filter(Boolean)
                .map(async (imageID) => {
                    try {
                        await bucket.delete(imageID);
                    } catch (error) {
                        console.error(
                            `Failed to delete R2 image ${imageID}`,
                            error,
                        );
                    }
                }),
        );

        return new Response(
            JSON.stringify({ message: "List deleted successfully" }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error deleting list", error);
        return new Response(
            JSON.stringify({ message: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};

export const PUT = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { listId, updateData = {} } = await context.request.json();
        if (!listId || typeof listId !== "string") {
            return new Response(
                JSON.stringify({ message: "Invalid list ID" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const existingRows = await db
            .select()
            .from(lists)
            .where(eq(lists.id, listId));
        const existingList = existingRows[0];

        if (!existingList) {
            return new Response(JSON.stringify({ message: "List not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (existingList.author !== user.id) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        const allowedFields = [
            "currency",
            "description",
            "private",
            "shortUrl",
            "spoilSurprises",
            "title",
        ];
        const changes = Object.fromEntries(
            Object.entries(updateData).filter(([key]) =>
                allowedFields.includes(key),
            ),
        );

        if (changes.shortUrl && changes.shortUrl !== existingList.shortUrl) {
            const conflicts = await db
                .select({ id: lists.id })
                .from(lists)
                .where(
                    and(
                        eq(lists.shortUrl, changes.shortUrl),
                        // The unique index also protects against races.
                        ne(lists.id, listId),
                    ),
                );

            if (conflicts.length) {
                return new Response(
                    JSON.stringify({ message: "Short URL already in use" }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }
        }

        const updatingToPrivate =
            changes.private === true && existingList.private === false;
        const updatingToPublic =
            changes.private === false && existingList.private === true;

        if (updatingToPrivate || updatingToPublic) {
            const usage = await getListUsage({ user });
            const limit = updatingToPrivate
                ? usage.limits.privateLists
                : usage.limits.publicLists;
            const countForTarget = updatingToPrivate
                ? usage.privateListCount
                : usage.publicListCount;

            if (limit !== -1 && countForTarget >= limit) {
                return new Response(
                    JSON.stringify({
                        message: updatingToPrivate
                            ? "Private list limit reached"
                            : "Public list limit reached",
                    }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    },
                );
            }

            if (updatingToPrivate) {
                const communityItems = await db
                    .select({ id: items.id, imageID: items.imageID })
                    .from(items)
                    .where(eq(items.communityList, listId));

                await db
                    .delete(items)
                    .where(eq(items.communityList, listId))
                    .run();

                await Promise.all(
                    communityItems
                        .map((item) => item.imageID)
                        .filter(Boolean)
                        .map((imageID) => bucket.delete(imageID)),
                );
            }
        }

        const updatedRows = await db
            .update(lists)
            .set(changes)
            .where(eq(lists.id, listId))
            .returning();

        return new Response(
            JSON.stringify({
                message: "List updated successfully",
                list: updatedRows[0],
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        console.error("Error updating list", error);
        return new Response(
            JSON.stringify({ message: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
