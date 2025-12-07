CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`geminiApiKey` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dictationSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`words` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dictationSessions_id` PRIMARY KEY(`id`)
);
