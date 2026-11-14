ALTER TABLE `user` ADD `dark_mode` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `spoil_surprises` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `show_total_price` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `saved_lists` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `list_sorting` text DEFAULT '{"type":{"name":"Last updated","value":"$updatedAt"},"order":"asc"}' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `history` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `hide_pwa_install_prompt` integer DEFAULT false NOT NULL;