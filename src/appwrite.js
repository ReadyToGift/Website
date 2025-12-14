import { Account, Avatars, Client, Databases, Functions, Locale, Storage, TablesDB } from "appwrite";
import {
    APPWRITE_DEV_KEY,
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT
} from "astro:env/client";

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);

if (APPWRITE_DEV_KEY) {
    client.setDevKey(APPWRITE_DEV_KEY);
}

const account = new Account(client);

const databases = new Databases(client);

const storage = new Storage(client);


const avatars = new Avatars(client);

const functions = new Functions(client);

const locale = new Locale(client);

const tablesDB = new TablesDB(client);

export { avatars, client, account, storage, databases, functions, locale, tablesDB };