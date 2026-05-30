import { APPWRITE_DB, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { appwriteErrorResponse, createAdminClient, requireAuth } from "@/server/appwrite";
import { Query } from "node-appwrite";

export const GET = async (context) => {
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

        const searchParams = context.url.searchParams;
        const sortOrder = searchParams.get("order") || "desc";
        const sortField = searchParams.get("sort") || "$createdAt";

        const savedListIDs = account?.prefs?.savedLists || [];

        let listQuery = [
            Query.limit(1000),
            sortOrder === "asc" ?
                Query.orderAsc(sortField) :
                Query.orderDesc(sortField)
        ];

        const authorQuery = Query.equal("author", account.$id);

        if (savedListIDs.length > 0) {
            listQuery.push(
                Query.or([
                    authorQuery,
                    Query.and([
                        Query.equal("$id", savedListIDs),
                        Query.equal("private", false)
                    ])
                ])
            );
        } else {
            listQuery.push(authorQuery);
        }

        let lists;

        try {
            lists = await adminClient.tablesDB.listRows({
                databaseId: APPWRITE_DB,
                tableId: APPWRITE_LIST_COLLECTION,
                queries: listQuery
            });
        } catch (err) {
            console.log(err);
            const resp = appwriteErrorResponse(err, "Appwrite backend is unavailable");
            if (resp) return resp;

            return new Response(
                JSON.stringify({
                    message: "Error fetching lists"
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
                lists: lists.rows
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {
        console.log("Internal server error:", error);
        const resp = appwriteErrorResponse(error, "Appwrite backend is unavailable");
        if (resp) return resp;
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