CREATE TABLE `autofills` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt` integer NOT NULL,
	`attemptStatus` text,
	`status` text DEFAULT 'processing',
	`autofillURL` text,
	`executionTime` real,
	`outputData` text,
	`totalAttempts` integer,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `fulfillments` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer,
	`updatedAt` integer,
	`item` text,
	`name` text NOT NULL,
	FOREIGN KEY (`item`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fulfillments_item_unique` ON `fulfillments` (`item`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`price` real,
	`url` text,
	`image` text,
	`imageID` text,
	`priority` text,
	`displayPrice` integer DEFAULT 1,
	`list` text,
	`communityList` text,
	`contributorName` text,
	`contributorId` text,
	`createdAt` integer,
	`updatedAt` integer,
	FOREIGN KEY (`list`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`communityList`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`author` text NOT NULL,
	`authorName` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`currency` text DEFAULT 'USD',
	`shortUrl` text,
	`itemCount` integer,
	`private` integer DEFAULT 0,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lists_shortUrl_unique` ON `lists` (`shortUrl`);