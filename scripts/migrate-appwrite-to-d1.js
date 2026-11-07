#!/usr/bin/env node

import process from "node:process";
import "dotenv/config";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { Client, Query, TablesDB, Users } from "node-appwrite";
import { account, user } from "../src/auth-schema.js";
import { autofills, fulfillments, items, lists } from "../src/schema.js";

const PAGE_SIZE = 100;
const TABLES = {
    lists: process.env.APPWRITE_LIST_COLLECTION || "6679a593003489f76668",
    items: process.env.APPWRITE_ITEM_COLLECTION || "6679a9ff000f53308164",
    fulfillments:
        process.env.APPWRITE_FULFILLMENT_COLLECTION || "667d90cd000d6f0f6d0a",
    autofills: "autofills",
};

const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
};

const date = (value) => {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

const idOf = (value) => {
    if (!value) return null;
    return typeof value === "object" ? value.$id || value.id || null : value;
};

async function listRows(tablesDB, databaseId, tableId) {
    const rows = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        let page;
        try {
            page = await tablesDB.listRows({
                databaseId,
                tableId,
                queries: [Query.limit(PAGE_SIZE), Query.offset(offset)],
            });
        } catch (error) {
            throw new Error(
                `Appwrite table read failed (${tableId}, offset ${offset})`,
                { cause: error },
            );
        }
        rows.push(...page.rows);
        if (page.rows.length < PAGE_SIZE) return rows;
    }
}

async function listUsers(users) {
    const result = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        let page;
        try {
            page = await users.list({
                queries: [Query.limit(PAGE_SIZE), Query.offset(offset)],
            });
        } catch (error) {
            throw new Error(`Appwrite user read failed (offset ${offset})`, {
                cause: error,
            });
        }
        result.push(...page.users);
        if (page.users.length < PAGE_SIZE) return result;
    }
}

function createD1Database() {
    const accountId = required("CLOUDFLARE_ACCOUNT_ID");
    const databaseId = required("CLOUDFLARE_DATABASE_ID");
    const token = required("CLOUDFLARE_D1_TOKEN");
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

    return drizzle(async (query, params) => {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ sql: query, params }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(
                `D1 query failed: ${JSON.stringify(payload.errors || payload)}`,
            );
        }
        return { rows: payload.result?.[0]?.results || [] };
    });
}

async function migrateUsers(db, users) {
    for (const source of users) {
        const createdAt = date(source.$createdAt) || date(source.registration);
        const updatedAt = date(source.$updatedAt) || createdAt;
        await db
            .insert(user)
            .values({
                id: source.$id,
                name: source.name || source.email,
                email: source.email,
                emailVerified: Boolean(source.emailVerification),
                image: null,
                createdAt,
                updatedAt,
            })
            .onConflictDoNothing()
            .run();

        // Appwrite does not expose password hashes. Keep the credential account so
        // a password-reset flow can attach to it, but users must set new passwords.
        await db
            .insert(account)
            .values({
                id: `${source.$id}-credential`,
                accountId: source.$id,
                providerId: "credential",
                userId: source.$id,
                password: null,
                createdAt,
                updatedAt,
            })
            .onConflictDoNothing()
            .run();
    }
}

async function migrateContent(db, source) {
    for (const row of source.lists) {
        await db
            .insert(lists)
            .values({
                id: row.$id,
                author: row.author,
                authorName: row.authorName,
                title: row.title,
                description: row.description,
                currency: row.currency || "USD",
                shortUrl: row.shortUrl,
                itemCount: row.itemCount,
                private: row.private,
                createdAt: date(row.$createdAt),
                updatedAt: date(row.$updatedAt),
            })
            .onConflictDoNothing()
            .run();
    }

    for (const row of source.items) {
        await db
            .insert(items)
            .values({
                id: row.$id,
                title: row.title,
                description: row.description,
                price: row.price,
                url: row.url || row.itemUrl,
                image: row.image,
                imageID: row.imageID,
                priority: row.priority,
                displayPrice: row.displayPrice ?? true,
                list: idOf(row.list),
                communityList: idOf(row.communityList),
                contributorName: row.contributorName,
                contributorId: row.contributorId,
                createdAt: date(row.$createdAt),
                updatedAt: date(row.$updatedAt),
            })
            .onConflictDoNothing()
            .run();
    }

    for (const row of source.fulfillments) {
        await db
            .insert(fulfillments)
            .values({
                id: row.$id,
                createdAt: date(row.$createdAt),
                updatedAt: date(row.$updatedAt),
                item: idOf(row.item),
                name: row.name,
            })
            .onConflictDoNothing()
            .run();
    }

    for (const row of source.autofills) {
        await db
            .insert(autofills)
            .values({
                id: row.$id,
                attempt: row.attempt,
                attemptStatus: row.attemptStatus,
                status: row.status || "processing",
                autofillURL: row.autofillURL,
                executionTime: row.executionTime,
                outputData: row.outputData,
                totalAttempts: row.totalAttempts,
                createdAt: date(row.$createdAt),
                updatedAt: date(row.$updatedAt),
            })
            .onConflictDoNothing()
            .run();
    }
}

async function main() {
    const endpoint = required("APPWRITE_ENDPOINT");
    const project = required("APPWRITE_PROJECT");
    const key = required("APPWRITE_KEY");
    const databaseId = process.env.APPWRITE_DB || "wishlist";
    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(project)
        .setKey(key);
    const tablesDB = new TablesDB(client);
    const usersApi = new Users(client);
    console.log("Reading Appwrite data...");
    const [users, source] = await Promise.all([
        listUsers(usersApi),
        Promise.all([
            listRows(tablesDB, databaseId, TABLES.lists),
            listRows(tablesDB, databaseId, TABLES.items),
            listRows(tablesDB, databaseId, TABLES.fulfillments),
            listRows(tablesDB, databaseId, TABLES.autofills),
        ]).then(([lists, items, fulfillments, autofills]) => ({
            lists,
            items,
            fulfillments,
            autofills,
        })),
    ]);

    console.log(
        `Users: ${users.length}; lists: ${source.lists.length}; items: ${source.items.length}; fulfillments: ${source.fulfillments.length}; autofills: ${source.autofills.length}`,
    );

    if (!process.argv.includes("--apply")) {
        console.log(
            "Dry run only. Apply with --apply to write through Drizzle.",
        );
        return;
    }

    const db = createD1Database();
    await migrateUsers(db, users);
    await migrateContent(db, source);
    console.log(
        "Migration applied. Appwrite passwords were not transferable; users need to set new passwords.",
    );
}

main().catch((error) => {
    console.error(error.stack || error);
    if (error.cause) {
        console.error("Cause:", error.cause.cause || error.cause);
    }
    process.exitCode = 1;
});
