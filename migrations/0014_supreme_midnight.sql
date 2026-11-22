ALTER TABLE `lists` ADD `primaryFont` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `secondaryFont` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `accentColor` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `weddingDate` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `registryTitle` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `weddingSections` text;--> statement-breakpoint
ALTER TABLE `lists` ADD `weddingConfigVersion` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `lists` DROP COLUMN `images`;