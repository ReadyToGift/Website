import { and, count, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { requireAuth } from "@/auth";
import { user as users } from "@/auth-schema";
import { db } from "@/db";
import { fulfillments, items, lists } from "@/schema";
import { getUserLimits } from "@/server/billing";
import { bucket } from "@/storage";
import {
    MAX_TEXT_LENGTHS,
    sanitizeText,
    validateImageDataUrl,
} from "@/utils/validation";
import { normalizeFocus } from "@/utils/weddingFocus";
import { normalizeWeddingAccent } from "@/utils/weddingTheme";

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

const sectionImageUrl = (id) => `/api/content/wedding/image/${id}`;
const sectionImageId = (url) => {
    if (typeof url !== "string") return null;
    const match = url.match(/^\/api\/content\/wedding\/image\/([^/]+)$/);
    return match?.[1] || null;
};
const weddingSectionImageIDs = (sections) =>
    (Array.isArray(sections) ? sections : [])
        .flatMap((section) => [
            sectionImageId(section?.imageUrl),
            ...(Array.isArray(section?.images)
                ? section.images.map((image) => sectionImageId(image?.imageUrl))
                : []),
        ])
        .filter(Boolean);

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
                accentColor: lists.accentColor,
                shortUrl: lists.shortUrl,
                private: lists.private,
                spoilSurprises: lists.spoilSurprises,
                type: lists.type,
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

        const communityItems =
            list.type === "wedding"
                ? []
                : await db
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
            accentColor = null,
            description = null,
            private: isPrivate = false,
            shortUrl = null,
            spoilSurprises = false,
            title,
            type = "standard",
        } = await context.request.json();

        const cleanTitle = sanitizeText(title, MAX_TEXT_LENGTHS.title);
        const cleanDescription =
            description == null
                ? null
                : sanitizeText(description, MAX_TEXT_LENGTHS.description);
        const cleanShortUrl =
            shortUrl == null || shortUrl === ""
                ? null
                : sanitizeText(shortUrl, MAX_TEXT_LENGTHS.shortUrl);
        const cleanAccentColor =
            type === "wedding" ? normalizeWeddingAccent(accentColor) : null;
        if (!cleanTitle) {
            return new Response(
                JSON.stringify({ message: "Title is required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        if (!["standard", "wedding"].includes(type)) {
            return new Response(
                JSON.stringify({ message: "Invalid list type" }),
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

        if (shortUrl != null && cleanShortUrl === null)
            return new Response(
                JSON.stringify({ message: "Invalid short URL" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        if (shortUrl) {
            const conflicts = await db
                .select({ id: lists.id })
                .from(lists)
                .where(eq(lists.shortUrl, cleanShortUrl));

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
                accentColor: cleanAccentColor,
                currency,
                description: cleanDescription,
                private: Boolean(isPrivate),
                shortUrl: cleanShortUrl,
                spoilSurprises: spoilSurprises === true,
                title: cleanTitle,
                type,
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
            .select({
                id: lists.id,
                author: lists.author,
                weddingSections: lists.weddingSections,
            })
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
            [
                ...imageRows.map((row) => row.imageID).filter(Boolean),
                ...weddingSectionImageIDs(listRows[0].weddingSections),
            ].map(async (imageID) => {
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
            "accentColor",
            "description",
            "private",
            "shortUrl",
            "spoilSurprises",
            "title",
            "registryTitle",
            "weddingDate",
            "weddingSections",
        ];
        const changes = Object.fromEntries(
            Object.entries(updateData).filter(([key]) =>
                allowedFields.includes(key),
            ),
        );
        if ("title" in changes)
            changes.title = sanitizeText(changes.title, MAX_TEXT_LENGTHS.title);
        if ("description" in changes)
            changes.description =
                changes.description == null
                    ? null
                    : sanitizeText(
                          changes.description,
                          MAX_TEXT_LENGTHS.description,
                      );
        if ("shortUrl" in changes)
            changes.shortUrl =
                changes.shortUrl == null || changes.shortUrl === ""
                    ? null
                    : sanitizeText(changes.shortUrl, MAX_TEXT_LENGTHS.shortUrl);
        if ("registryTitle" in changes)
            changes.registryTitle = sanitizeText(
                changes.registryTitle,
                MAX_TEXT_LENGTHS.title,
            );
        if ("weddingDate" in changes)
            changes.weddingDate = sanitizeText(changes.weddingDate, 32);
        if ("accentColor" in changes)
            changes.accentColor =
                existingList.type === "wedding"
                    ? normalizeWeddingAccent(changes.accentColor)
                    : null;
        const newSectionImageIDs = [];
        if ("weddingSections" in changes) {
            const sectionTypes = new Set([
                "text",
                "image",
                "gallery",
                "image-text",
                "text-image",
            ]);
            const saveSectionImage = async (entry) => {
                const imageData =
                    entry?.imageData ||
                    (typeof entry?.image === "string" &&
                    entry.image.startsWith("data:")
                        ? entry.image
                        : null);
                if (imageData && entry?.imageUrl) {
                    const error = new Error(
                        "Section imageData and imageUrl cannot both be provided",
                    );
                    error.status = 400;
                    throw error;
                }
                if (!imageData) {
                    return sectionImageId(entry?.imageUrl)
                        ? entry.imageUrl
                        : null;
                }

                const validation = await validateImageDataUrl(
                    imageData,
                    4 * 1024 * 1024,
                );
                if (!validation.ok) {
                    const error = new Error(validation.message);
                    error.status = 400;
                    throw error;
                }
                const id = crypto.randomUUID();
                await bucket.put(id, validation.bytes, {
                    httpMetadata: { contentType: validation.type },
                    customMetadata: { name: "Wedding section image" },
                });
                newSectionImageIDs.push(id);
                return sectionImageUrl(id);
            };

            const normalizedSections = [];
            try {
                for (const section of Array.isArray(changes.weddingSections)
                    ? changes.weddingSections.slice(0, 50)
                    : []) {
                    if (!sectionTypes.has(section?.type)) continue;
                    const id =
                        sanitizeText(section.id, 64) || crypto.randomUUID();
                    if (section.type === "gallery") {
                        if (
                            !Array.isArray(section.images) ||
                            section.images.length < 2 ||
                            section.images.length > 6
                        ) {
                            const error = new Error(
                                "A gallery must have between 2 and 6 photos",
                            );
                            error.status = 400;
                            throw error;
                        }
                        const images = [];
                        for (const entry of section.images) {
                            const imageUrl = await saveSectionImage(entry);
                            if (!imageUrl) {
                                const error = new Error(
                                    "Invalid gallery photo",
                                );
                                error.status = 400;
                                throw error;
                            }
                            images.push({
                                imageUrl,
                                ...(Number.isInteger(entry.width) &&
                                Number.isInteger(entry.height) &&
                                entry.width > 0 &&
                                entry.height > 0 &&
                                entry.width <= 10000 &&
                                entry.height <= 10000
                                    ? {
                                          width: entry.width,
                                          height: entry.height,
                                      }
                                    : {}),
                                focusX: normalizeFocus(entry.focusX),
                                focusY: normalizeFocus(entry.focusY),
                            });
                        }
                        normalizedSections.push({
                            id,
                            images,
                            type: "gallery",
                        });
                        continue;
                    }

                    const imageUrl = await saveSectionImage(section);
                    normalizedSections.push({
                        ...(imageUrl ? { imageUrl } : {}),
                        focusX: normalizeFocus(section.focusX),
                        focusY: normalizeFocus(section.focusY),
                        id,
                        text:
                            sanitizeText(
                                section.text,
                                MAX_TEXT_LENGTHS.description,
                            ) || "",
                        title:
                            sanitizeText(
                                section.title,
                                MAX_TEXT_LENGTHS.title,
                            ) || "",
                        type: section.type,
                    });
                }
            } catch (error) {
                await Promise.all(
                    newSectionImageIDs.map((id) => bucket.delete(id)),
                );
                throw error;
            }
            changes.weddingSections = normalizedSections;
        }
        if ("title" in changes && !changes.title)
            return new Response(JSON.stringify({ message: "Invalid title" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        if (
            "description" in changes &&
            changes.description === null &&
            updateData.description != null
        )
            return new Response(
                JSON.stringify({ message: "Invalid description" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        if (
            "shortUrl" in changes &&
            changes.shortUrl === null &&
            updateData.shortUrl != null &&
            updateData.shortUrl !== ""
        )
            return new Response(
                JSON.stringify({ message: "Invalid short URL" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
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

        let updatedRows;
        try {
            updatedRows = await db
                .update(lists)
                .set(changes)
                .where(eq(lists.id, listId))
                .returning();
        } catch (error) {
            await Promise.all(
                newSectionImageIDs.map((id) => bucket.delete(id)),
            );
            throw error;
        }

        if ("weddingSections" in changes) {
            const oldImageIDs = weddingSectionImageIDs(
                existingList.weddingSections,
            );
            const newImageIDs = weddingSectionImageIDs(changes.weddingSections);
            await Promise.all(
                oldImageIDs
                    .filter((id) => !newImageIDs.includes(id))
                    .map((id) => bucket.delete(id)),
            );
        }

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
            JSON.stringify({
                message:
                    error.status === 400
                        ? error.message
                        : "Internal server error",
            }),
            {
                status: error.status === 400 ? 400 : 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
