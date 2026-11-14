CREATE TABLE `userPreferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text,
	`prefs` text,
	FOREIGN KEY (`user`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
