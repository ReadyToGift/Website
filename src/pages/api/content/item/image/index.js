import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
export const prerender = false;
import { Buffer } from "buffer";

import { createAdminClient, requireAuth } from "@/server/appwrite";
import { Permission, Query, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export const GET = async (context) => {
    try {
        const { sessionClient, account } = await requireAuth(context);

        if (!sessionClient || !account) {
            return new Response(JSON.stringify({ message: "Unauthenticated" }), {
                status: 401,
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

        const { searchParams } = new URL(context.request.url);
        const fileId = searchParams.get("fileId");
        const itemId = searchParams.get("itemId");

        if (!fileId) {
            return new Response(JSON.stringify({ message: "Missing file ID" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!itemId) {
            return new Response(JSON.stringify({ message: "Missing item ID" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const item = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_ITEM_COLLECTION,
            rowId: itemId,
            queries: [Query.select(["*", "list.*"])]
        });

        if (!item || item.imageID !== fileId) {
            return new Response(JSON.stringify({ message: "File not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        const communityItem = item.communityList && item.contributorId && item.contributorName;
        const isCommunityitemContributor = communityItem && item.contributorId === account.$id;
        const isListAuthor = !communityItem && item.list?.author === account.$id;

        if (!isCommunityitemContributor && !isListAuthor) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        const file = await adminClient.storage.getFile({
            bucketId: APPWRITE_IMAGE_BUCKET,
            fileId
        });

        return new Response(JSON.stringify({
            file: {
                mimeType: file.mimeType,
                name: file.name,
                size: file.sizeOriginal,
                updatedAt: file.$updatedAt
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.log(err);
        return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST = async (context) => {
    try {
        const { sessionClient, account } = await requireAuth(context);

        if (!sessionClient || !account) {
            return new Response(JSON.stringify({ message: "Unauthenticated" }), {
                status: 401,
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

        const formData = await context.request.formData();
        const file = formData.get("file");
        const listId = formData.get("listId");

        if (!file || typeof file === "string") {
            return new Response(JSON.stringify({ message: "Missing file" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!listId || typeof listId !== "string") {
            return new Response(JSON.stringify({ message: "Missing list ID" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const list = await adminClient.tablesDB.getRow({
            databaseId: APPWRITE_DB,
            tableId: APPWRITE_LIST_COLLECTION,
            rowId: listId,
            queries: [Query.select(["$id", "author", "private"])]
        });

        if (!list) {
            return new Response(JSON.stringify({ message: "List not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" }
            });
        }

        if (list.private && list.author !== account.$id) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        const permissions = [
            Permission.write(Role.user(account.$id)),
            Permission.delete(Role.user(account.$id)),
            Permission.update(Role.user(account.$id)),
            list.private ? Permission.read(Role.user(account.$id)) : Permission.read(Role.any())
        ];

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileInput = InputFile.fromBuffer(buffer, file.name);

        const uploaded = await adminClient.storage.createFile({
            bucketId: APPWRITE_IMAGE_BUCKET,
            fileId: "unique()",
            file: fileInput,
            permissions
        });

        return new Response(JSON.stringify({ file: uploaded }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.log(err);
        return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
