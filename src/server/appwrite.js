import * as appwriteClient from "appwrite";
import * as appwriteSdk from "node-appwrite";
import { APPWRITE_DEV_KEY, APPWRITE_ENDPOINT, APPWRITE_PROJECT } from "astro:env/client";
import { APPWRITE_KEY } from "astro:env/server";

import { extractJwt } from "./auth";

// Admin client, used to create new accounts
export function createAdminClient() {
    const client = new appwriteSdk.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT)
        .setKey(APPWRITE_KEY);

    // Return the services you need
    return {
        get account() {
            return new appwriteSdk.Account(client);
        },
        get avatars() {
            return new appwriteSdk.Avatars(client);
        },
        get user() {
            return new appwriteSdk.Users(client);
        },
        get locale() {
            return new appwriteSdk.Locale(client);
        },
        get tablesDB() {
            return new appwriteSdk.TablesDB(client);
        },
        get messaging() {
            return new appwriteSdk.Messaging(client);
        },
        get storage() {
            return new appwriteSdk.Storage(client);
        }
    };
}

export const createSessionClient = ({ request, jwt }) => {
    const client = new appwriteClient.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT);
    
    if (APPWRITE_DEV_KEY) {
        client.setDevKey(APPWRITE_DEV_KEY);
    }

    if (!request && !jwt) {
        throw new Error("Request or jwt must be provided");
    }

    if (request) {
        jwt = extractJwt({ request });
    }

    client.setJWT(jwt);

    return {
        get account() {
            return new appwriteClient.Account(client);
        },
        get avatars() {
            return new appwriteClient.Avatars(client);
        },
        get tablesDB() {
            return new appwriteClient.TablesDB(client);
        },
        jwt: jwt
    };
};


export const requireAuth = async (context) => {
    let sessionClient;
    try {
        sessionClient = createSessionClient(context);
    } catch (err) {
        console.log(err);

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

    const account = await sessionClient.account.get();

    if (!account) {
        return new Response(null, {
            status: 401
        });
    };

    return { sessionClient, account };
};