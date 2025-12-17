import * as appwriteClient from "appwrite";
import * as appwriteSdk from "node-appwrite";
import { APPWRITE_DEV_KEY, APPWRITE_ENDPOINT, APPWRITE_PROJECT } from "astro:env/client";
import { APPWRITE_KEY } from "astro:env/server";

export const SESSION_COOKIE = "appwrite";

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
        get locale() {
            return new appwriteSdk.Locale(client);
        },
        get tablesDB() {
            return new appwriteSdk.TablesDB(client);
        },
        get messaging() {
            return new appwriteSdk.Messaging(client);
        }
    };
}

// Session client, used to make requests on behalf of the logged in user
export function createSessionClient({ request, session }) {
    const client = new appwriteClient.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT);
    
    if (APPWRITE_DEV_KEY) {
        client.setDevKey(APPWRITE_DEV_KEY);
    }

    if (!request && !session) {
        throw new Error("Request or session must be provided");
    }

    if (request) {
        // Get the session cookie from the request and set the session
        const cookies = parseCookies(request.headers.get("cookie") ?? "");
        session = cookies.get(SESSION_COOKIE);
        if (!session) {
            throw new Error("Session cookie not found");
        }
    }

    client.setSession(session);


    // Return the services you need
    return {
        get account() {
            return new appwriteClient.Account(client);
        },
        session: session
    };
}

// Helper function to parse cookies
function parseCookies(cookies) {
    const map = new Map();
    for (const cookie of cookies.split(";")) {
        const [name, value] = cookie.split("=");
        map.set(name.trim(), value ?? null);
    }
    return map;
}
