import { APPWRITE_DB, APPWRITE_IMAGE_BUCKET, APPWRITE_ITEM_COLLECTION, APPWRITE_LIST_COLLECTION } from "astro:env/client";
import { AppwriteException, Permission, Query, Role } from "node-appwrite";
import { createAdminClient, requireAuth } from "@/server/appwrite";
import { getUserLimits } from "@/server/billing";


export const GET = async (context) => {

};