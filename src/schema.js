import { relations } from "drizzle-orm";
import {
    integer,
    real,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";
import { user } from "./auth-schema.js";

export const lists = sqliteTable("lists", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    author: text("author")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    authorName: text("authorName").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    currency: text("currency").default("USD"),
    shortUrl: text("shortUrl").unique(),
    itemCount: integer("itemCount"),
    private: integer("private", { mode: "boolean" }).default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const items = sqliteTable("items", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    title: text("title").notNull(),
    description: text("description"),
    price: real("price"),
    url: text("url"),
    image: text("image"),
    imageID: text("imageID"),
    priority: text("priority"),
    displayPrice: integer("displayPrice", { mode: "boolean" }).default(1),
    list: text("list").references(() => lists.id, { onDelete: "cascade" }),
    communityList: text("communityList").references(() => lists.id, {
        onDelete: "cascade",
    }),
    contributorName: text("contributorName"),
    contributorId: text("contributorId"),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const fulfillments = sqliteTable(
    "fulfillments",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => uuidv7()),
        createdAt: integer("createdAt", { mode: "timestamp" }),
        updatedAt: integer("updatedAt", { mode: "timestamp" }),
        item: text("item").references(() => items.id, { onDelete: "set null" }),
        name: text("name").notNull(),
    },
    (table) => [uniqueIndex("fulfillments_item_unique").on(table.item)],
);

export const autofills = sqliteTable("autofills", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    attempt: integer("attempt").notNull(),
    attemptStatus: text("attemptStatus"),
    status: text("status", {
        enum: ["processing", "failed", "completed"],
    }).default("processing"),
    autofillURL: text("autofillURL"),
    executionTime: real("executionTime"),
    outputData: text("outputData"),
    totalAttempts: integer("totalAttempts"),
    createdAt: integer("createdAt", { mode: "timestamp" }),
    updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const userPreferences = sqliteTable("userPreferences", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => uuidv7()),
    user: text("user").references(() => user.id),
    prefs: text("prefs"),
});

export const listRelations = relations(lists, ({ many, one }) => ({
    authorUser: one(user, {
        fields: [lists.author],
        references: [user.id],
    }),
    items: many(items, { relationName: "list" }),
}));

export const itemRelations = relations(items, ({ one }) => ({
    list: one(lists, {
        fields: [items.list],
        references: [lists.id],
        relationName: "list",
    }),
    fulfillment: one(fulfillments, {
        fields: [items.id],
        references: [fulfillments.item],
    }),
    communityList: one(lists, {
        fields: [items.communityList],
        references: [lists.id],
        relationName: "communityList",
    }),
}));

export const fulfillmentRelations = relations(fulfillments, ({ one }) => ({
    item: one(items, {
        fields: [fulfillments.item],
        references: [items.id],
    }),
}));

export const userPreferencesRelations = relations(
    userPreferences,
    ({ one }) => ({
        user: one(user, {
            fields: [userPreferences.user],
            references: [user.id],
        }),
    }),
);
