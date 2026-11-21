CREATE TABLE `local_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `local_cache_expiry` ON `local_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `local_images` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`uploaded` integer NOT NULL
);
