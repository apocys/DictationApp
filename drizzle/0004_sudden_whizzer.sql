CREATE TABLE `dictationCorrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`originalText` text NOT NULL,
	`userImageUrl` text NOT NULL,
	`extractedUserText` text NOT NULL,
	`errors` text NOT NULL,
	`score` int NOT NULL,
	`totalWords` int NOT NULL,
	`correctWords` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dictationCorrections_id` PRIMARY KEY(`id`)
);
