import { and, asc, count, desc, eq, inArray, or } from "drizzle-orm";
import { requireAuth } from "@/auth";
import { user as users } from "@/auth-schema";
import { db } from "@/db";
import { items, lists } from "@/schema";

export const prerender = false;

export const GET = async (context) => {
    try {
        const { unauthorizedResponse, user } = requireAuth(context);
        if (unauthorizedResponse) return unauthorizedResponse;

        const searchParams = context.url.searchParams;
        const sortOrder = searchParams.get("order") || "desc";
        const requestedSortField = searchParams.get("sort") || "createdAt";
        const sortField = requestedSortField;

        const validSortFields = [
            "createdAt",
            "updatedAt",
            "title",
            "itemCount",
        ];
        if (!validSortFields.includes(sortField)) {
            console.warn("Invalid list sort field", {
                sortField: requestedSortField,
                validSortFields,
            });

            return new Response(
                JSON.stringify({
                    message: `Invalid sort field: ${sortField}`,
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        const requestedSavedListIDs = (searchParams.get("savedLists") || "")
            .split(",")
            .filter(Boolean);
        const savedListIDs = [
            ...new Set([...(user?.savedLists || []), ...requestedSavedListIDs]),
        ];

        const authorQuery = eq(lists.author, user.id);
        const savedListsQuery =
            savedListIDs.length > 0
                ? and(inArray(lists.id, savedListIDs), eq(lists.private, false))
                : undefined;

        const itemCount = count(items.id);

        const returnedLists = await db
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
                itemCount,
            })
            .from(lists)
            .leftJoin(users, eq(users.id, lists.author))
            .leftJoin(
                items,
                or(eq(items.list, lists.id), eq(items.communityList, lists.id)),
            )
            .where(or(authorQuery, savedListsQuery))
            .groupBy(lists.id, users.id, users.name)
            .orderBy(
                sortOrder === "asc"
                    ? asc(
                          sortField === "itemCount"
                              ? itemCount
                              : lists[sortField],
                      )
                    : desc(
                          sortField === "itemCount"
                              ? itemCount
                              : lists[sortField],
                      ),
            );

        return new Response(
            JSON.stringify({
                lists: returnedLists,
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error) {
        console.log("Internal server error:", error);
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
