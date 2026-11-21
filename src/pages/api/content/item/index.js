import { and, count, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/auth";
import { user as users } from "@/auth-schema";
import { db } from "@/db";
import { items, lists } from "@/schema";
import { getUserLimits } from "@/server/billing";
import { bucket } from "@/storage";
import {
    isSafeHttpUrl,
    MAX_TEXT_LENGTHS,
    sanitizeText,
    validateImageFile,
} from "@/utils/validation";

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
            contributorId: items.contributor,
            contributorName: users.name,
            listId: items.list,
            listAuthor: lists.author,
            imageID: items.imageID,
        })
        .from(items)
        .leftJoin(lists, eq(lists.id, items.list))
        .leftJoin(users, eq(users.id, items.contributor))
        .where(eq(items.id, itemId));
    return item;
};

const isCommunityItem = (item) => Boolean(item.communityList);

const canManageItem = (item, userId) =>
    (isCommunityItem(item) && item.contributorId === userId) ||
    (!isCommunityItem(item) && item.listAuthor === userId);

const getItemCount = async (listId) => {
    const [result] = await db
        .select({ count: count(items.id) })
        .from(items)
        .where(and(eq(items.list, listId), isNull(items.communityList)));
    return result?.count ?? 0;
};

const formatItem = (item, contributorName = null) => ({
    ...item,
    contributorId: item.contributor,
    contributorName,
});

const parseRequest = async (request) => {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
        const formData = await request.formData();
        return {
            data: JSON.parse(formData.get("itemData") || "{}"),
            file: formData.get("file"),
        };
    }

    return { data: await request.json(), file: null };
};

const uploadImage = async (file) => {
    if (!file || typeof file === "string") return null;
    const validation = await validateImageFile(file);
    if (!validation.ok) {
        const error = new Error(validation.message);
        error.status = 400;
        throw error;
    }
    const id = crypto.randomUUID();
    await bucket.put(id, validation.bytes, {
        httpMetadata: {
            contentType: validation.type,
        },
        customMetadata: { name: file.name || "Uploaded image" },
    });
    return id;
};

const deleteImage = async (imageID) => {
    if (!imageID) return;
    try {
        await bucket.delete(imageID);
    } catch (error) {
        console.error(`Failed to delete image ${imageID}`, error);
    }
};

const touchLists = async (listIds) => {
    const updatedAt = new Date();
    for (const listId of new Set(listIds.filter(Boolean))) {
        await db.update(lists).set({ updatedAt }).where(eq(lists.id, listId));
    }
};

export const POST = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { data: itemData, file } = await parseRequest(context.request);
        const {
            communityList,
            contributorId,
            description,
            displayPrice,
            image,
            imageID,
            list: listId,
            price,
            priority,
            title,
            url,
        } = itemData || {};

        const cleanTitle = sanitizeText(title, MAX_TEXT_LENGTHS.title);
        const cleanDescription =
            description == null
                ? null
                : sanitizeText(description, MAX_TEXT_LENGTHS.description);
        const cleanUrl =
            url == null || url === ""
                ? null
                : sanitizeText(url, MAX_TEXT_LENGTHS.url);
        if (
            !cleanTitle ||
            cleanTitle.length > MAX_TEXT_LENGTHS.title ||
            (cleanDescription === null && description != null) ||
            (cleanUrl && !isSafeHttpUrl(cleanUrl))
        )
            return json({ message: "Invalid item data" }, 400);

        const [list] = await db
            .select({
                id: lists.id,
                author: lists.author,
                private: lists.private,
            })
            .from(lists)
            .where(eq(lists.id, listId));
        if (!list) return json({ message: "List not found" }, 404);

        const communityItem = Boolean(communityList && contributorId);
        if (communityItem && list.private) {
            return json(
                { message: "Cannot add an item to a private list" },
                403,
            );
        }
        if (!communityItem && list.author !== user.id) {
            return json({ message: "Unauthorized" }, 403);
        }
        if (!communityItem) {
            const { limits } = await getUserLimits({
                user,
            });
            const itemCount = await getItemCount(listId);
            if (
                limits.itemsPerList !== -1 &&
                itemCount >= limits.itemsPerList
            ) {
                return json({ message: "Item limit for list reached" }, 400);
            }
        }

        const imageIDFromFile = await uploadImage(file);
        let item;
        try {
            [item] = await db
                .insert(items)
                .values({
                    communityList: communityList || null,
                    contributor: contributorId || null,
                    description: cleanDescription || null,
                    displayPrice: Boolean(displayPrice),
                    image:
                        image && isSafeHttpUrl(image)
                            ? sanitizeText(image, MAX_TEXT_LENGTHS.url)
                            : null,
                    imageID: imageIDFromFile || imageID || null,
                    list: listId,
                    price: Number(price) || 0,
                    priority: priority || "none",
                    title: cleanTitle,
                    url: cleanUrl,
                })
                .returning();
        } catch (error) {
            await deleteImage(imageIDFromFile);
            throw error;
        }

        await touchLists([listId]);

        return json({
            item: formatItem(item, communityItem ? user.name : null),
        });
    } catch (error) {
        console.error(error);
        return json(
            {
                message:
                    error.status === 400
                        ? error.message
                        : "Internal server error",
            },
            error.status === 400 ? 400 : 500,
        );
    }
};

export const DELETE = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { itemId } = await context.request.json();
        if (!itemId || typeof itemId !== "string") {
            return json({ message: "Invalid item ID" }, 400);
        }

        const item = await getItem(itemId);
        if (!item) return json({ message: "Item not found" }, 404);
        if (!canManageItem(item, user.id))
            return json({ message: "Unauthorized" }, 403);

        await db.delete(items).where(eq(items.id, itemId));
        await touchLists([item.listId]);

        if (item.imageID) {
            try {
                await bucket.delete(item.imageID);
            } catch (error) {
                console.error(
                    `Failed to delete image ${item.imageID} for item ${itemId}`,
                    error,
                );
            }
        }

        return json({ message: "Item deleted successfully" });
    } catch (error) {
        console.error(error);
        return json(
            {
                message:
                    error.status === 400
                        ? error.message
                        : "Internal server error",
            },
            error.status === 400 ? 400 : 500,
        );
    }
};

export const PUT = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { data, file } = await parseRequest(context.request);
        const { itemId, updateData = {}, removeImage = false } = data;
        if (!itemId || typeof itemId !== "string") {
            return json({ message: "Invalid item ID" }, 400);
        }
        if (
            !updateData ||
            typeof updateData !== "object" ||
            Array.isArray(updateData)
        ) {
            return json({ message: "Invalid update data" }, 400);
        }

        const item = await getItem(itemId);
        if (!item) return json({ message: "Item not found" }, 404);
        if (!canManageItem(item, user.id))
            return json({ message: "Unauthorized" }, 403);

        const targetListId = updateData.list || item.listId;
        if (isCommunityItem(item) && targetListId !== item.listId) {
            return json(
                { message: "Community items cannot be moved between lists" },
                400,
            );
        }

        const [targetList] = await db
            .select({ id: lists.id, author: lists.author })
            .from(lists)
            .where(eq(lists.id, targetListId));
        if (!targetList) return json({ message: "List not found" }, 404);

        const moving = !isCommunityItem(item) && targetListId !== item.listId;
        if (moving && targetList.author !== user.id) {
            return json({ message: "Unauthorized" }, 403);
        }
        if (moving) {
            const { limits } = await getUserLimits({
                user,
            });
            const itemCount = await getItemCount(targetListId);
            if (
                limits.itemsPerList !== -1 &&
                itemCount >= limits.itemsPerList
            ) {
                return json({ message: "Item limit for list reached" }, 400);
            }
        }

        const allowedFields = [
            "description",
            "displayPrice",
            "image",
            "imageID",
            "price",
            "priority",
            "title",
            "url",
        ];
        const changes = Object.fromEntries(
            allowedFields
                .filter((field) => field in updateData)
                .map((field) => [field, updateData[field]]),
        );
        for (const field of ["title", "description", "url", "image"]) {
            if (!(field in changes)) continue;
            const limit =
                field === "title"
                    ? MAX_TEXT_LENGTHS.title
                    : field === "description"
                      ? MAX_TEXT_LENGTHS.description
                      : MAX_TEXT_LENGTHS.url;
            changes[field] =
                changes[field] == null
                    ? null
                    : sanitizeText(changes[field], limit);
        }
        if (changes.title !== undefined && !changes.title)
            return json({ message: "Invalid item title" }, 400);
        if (changes.url && !isSafeHttpUrl(changes.url))
            return json({ message: "Invalid item URL" }, 400);
        if (changes.image && !isSafeHttpUrl(changes.image))
            changes.image = null;
        const newImageID = await uploadImage(file);
        if (newImageID) changes.imageID = newImageID;
        if (removeImage) changes.imageID = null;
        if (moving) changes.list = targetListId;

        let updatedItem;
        try {
            [updatedItem] = await db
                .update(items)
                .set(changes)
                .where(eq(items.id, itemId))
                .returning();
        } catch (error) {
            await deleteImage(newImageID);
            throw error;
        }

        if (newImageID || removeImage) {
            await deleteImage(item.imageID);
        }

        await touchLists([item.listId, targetListId]);

        return json({
            message: "Item updated successfully",
            item: formatItem(updatedItem, item.contributorName),
        });
    } catch (error) {
        console.error(error);
        return json({ message: "Internal server error" }, 500);
    }
};
