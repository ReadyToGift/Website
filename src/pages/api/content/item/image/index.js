import { eq } from "drizzle-orm";
import { requireAuth } from "@/auth";
import { db } from "@/db";
import { items, lists } from "@/schema";
import { bucket } from "@/storage";

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
            imageID: items.imageID,
            communityList: items.communityList,
            contributorId: items.contributor,
            listAuthor: lists.author,
        })
        .from(items)
        .leftJoin(lists, eq(lists.id, items.list))
        .where(eq(items.id, itemId));
    return item;
};

const canManageItem = (item, userId) =>
    (item.communityList && item.contributorId === userId) ||
    (!item.communityList && item.listAuthor === userId);

export const GET = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const { searchParams } = context.url;
        const fileId = searchParams.get("fileId");
        const itemId = searchParams.get("itemId");
        if (!fileId) return json({ message: "Missing file ID" }, 400);
        if (!itemId) return json({ message: "Missing item ID" }, 400);

        const item = await getItem(itemId);
        if (!item || item.imageID !== fileId) {
            return json({ message: "File not found" }, 404);
        }
        if (!canManageItem(item, user.id)) {
            return json({ message: "Unauthorized" }, 403);
        }

        const file = await bucket.head(fileId);
        if (!file) return json({ message: "File not found" }, 404);

        return json({
            file: {
                id: fileId,
                mimeType: file.httpMetadata?.contentType || "image/*",
                name: file.customMetadata?.name || "Current image",
                size: file.size,
                updatedAt: file.uploaded,
            },
        });
    } catch (error) {
        console.error(error);
        return json({ message: "Internal server error" }, 500);
    }
};

export const POST = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const formData = await context.request.formData();
        const file = formData.get("file");
        const listId = formData.get("listId");
        if (!file || typeof file === "string") {
            return json({ message: "Missing file" }, 400);
        }
        if (!listId || typeof listId !== "string") {
            return json({ message: "Missing list ID" }, 400);
        }

        const [list] = await db
            .select({ author: lists.author, private: lists.private })
            .from(lists)
            .where(eq(lists.id, listId));
        if (!list) return json({ message: "List not found" }, 404);
        if (list.private && list.author !== user.id) {
            return json({ message: "Unauthorized" }, 403);
        }

        const id = crypto.randomUUID();
        await bucket.put(id, await file.arrayBuffer(), {
            httpMetadata: {
                contentType: file.type || "application/octet-stream",
            },
            customMetadata: { name: file.name || "Uploaded image" },
        });

        return json({
            file: {
                id,
                name: file.name || "Uploaded image",
                mimeType: file.type || "application/octet-stream",
                size: file.size,
            },
        });
    } catch (error) {
        console.error(error);
        return json({ message: "Internal server error" }, 500);
    }
};
