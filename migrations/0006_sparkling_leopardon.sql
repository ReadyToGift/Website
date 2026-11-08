ALTER TABLE `items` RENAME COLUMN "contributorId" TO "contributor";--> statement-breakpoint
ALTER TABLE `items` DROP COLUMN `contributorName`;--> statement-breakpoint
ALTER TABLE `lists` DROP COLUMN `authorName`;--> statement-breakpoint
ALTER TABLE `lists` DROP COLUMN `itemCount`;