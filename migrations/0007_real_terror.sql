ALTER TABLE `user` DROP COLUMN `spoil_surprises`;--> statement-breakpoint
ALTER TABLE `lists` ADD `spoilSurprises` integer DEFAULT 0;
