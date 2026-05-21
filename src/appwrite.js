import { Account, Avatars, Client } from "appwrite";
import {
    APPWRITE_DEV_KEY,
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT
} from "astro:env/client";

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);

if (APPWRITE_DEV_KEY) {
    console.log("Setting dev key for Appwrite client");
    client.setDevKey(APPWRITE_DEV_KEY);
}

const account = new Account(client);
const avatars = new Avatars(client);

export { avatars, account };