import {
    mkdirSync,
    readFileSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { and, eq, gt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as authSchema from "@/auth-schema.js";
import * as appSchema from "@/schema.js";

const dataDir = resolve(process.env.DATA_DIR || "data");
const imageDir = resolve(dataDir, "images");
const migrationsFolder = resolve(process.cwd(), "migrations");
mkdirSync(dataDir, { recursive: true });
mkdirSync(imageDir, { recursive: true });
const filename = resolve(dataDir, "readytogift.sqlite");
const database = drizzle(filename, {
    schema: {
        ...authSchema,
        ...appSchema,
    },
});

const imagePath = (id) => resolve(imageDir, id);

migrate(database, {
    migrationsFolder,
});

export const db = database;
export const waitUntil = undefined;
export const localImageBaseUrl = "/api/content/item/image";
export const getEnv = (key) => process.env[key];

export const cache = {
    async get(key) {
        return database
            .select({ value: appSchema.cache.value })
            .from(appSchema.cache)
            .where(
                and(
                    eq(appSchema.cache.key, key),
                    gt(appSchema.cache.expiresAt, Date.now()),
                ),
            )
            .get()?.value;
    },
    async put(key, value, { expirationTtl }) {
        const now = Date.now();
        const expiresAt = now + expirationTtl * 1000;
        database
            .delete(appSchema.cache)
            .where(lte(appSchema.cache.expiresAt, now))
            .run();
        database
            .insert(appSchema.cache)
            .values({ key, value, expiresAt })
            .onConflictDoUpdate({
                target: appSchema.cache.key,
                set: { value, expiresAt },
            })
            .run();
    },
    async delete(key) {
        database
            .delete(appSchema.cache)
            .where(eq(appSchema.cache.key, key))
            .run();
    },
};

const getImage = (id) =>
    database
        .select()
        .from(appSchema.localImages)
        .where(eq(appSchema.localImages.id, id))
        .get();

const imageMetadata = ({ contentType, name, uploaded }, size) => ({
    httpMetadata: { contentType },
    customMetadata: { name },
    size,
    uploaded,
});

export const bucket = {
    put(id, body, { httpMetadata, customMetadata }) {
        const target = imagePath(id);
        writeFileSync(target, Buffer.from(body));

        const metadata = {
            name: customMetadata.name,
            contentType: httpMetadata.contentType,
            uploaded: new Date(),
        };
        database
            .insert(appSchema.localImages)
            .values({ id, ...metadata })
            .onConflictDoUpdate({
                target: appSchema.localImages.id,
                set: metadata,
            })
            .run();
    },
    head(id) {
        const row = getImage(id);
        if (!row) return null;
        try {
            return imageMetadata(row, statSync(imagePath(id)).size);
        } catch {
            return null;
        }
    },
    get(id) {
        const row = getImage(id);
        if (!row) return null;
        try {
            const body = readFileSync(imagePath(id));
            return { ...imageMetadata(row, body.byteLength), body };
        } catch {
            return null;
        }
    },
    delete(id) {
        try {
            unlinkSync(imagePath(id));
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
        }
        database
            .delete(appSchema.localImages)
            .where(eq(appSchema.localImages.id, id))
            .run();
    },
};
