CREATE TABLE `customer_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`platform` enum('facebook','instagram') NOT NULL,
	`account_id` varchar(64) NOT NULL,
	`account_name` varchar(256),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`logo_url` text,
	`primary_color` varchar(16),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `fb_pages` (
	`page_id` varchar(64) NOT NULL,
	`name` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fb_pages_page_id` PRIMARY KEY(`page_id`)
);
--> statement-breakpoint
CREATE TABLE `fb_post_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` varchar(128) NOT NULL,
	`snapshot_time` datetime NOT NULL,
	`reactions_total` int DEFAULT 0,
	`comments_total` int DEFAULT 0,
	`shares_total` int,
	`reach` int,
	`impressions` int,
	`video_3s_views` int,
	`shares_limited` boolean DEFAULT true,
	`raw_json` json,
	CONSTRAINT `fb_post_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fb_posts` (
	`post_id` varchar(128) NOT NULL,
	`page_id` varchar(64) NOT NULL,
	`created_time` datetime NOT NULL,
	`type` varchar(32),
	`permalink` text,
	`message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fb_posts_post_id` PRIMARY KEY(`post_id`)
);
--> statement-breakpoint
CREATE TABLE `ig_accounts` (
	`account_id` varchar(64) NOT NULL,
	`username` varchar(128),
	`name` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ig_accounts_account_id` PRIMARY KEY(`account_id`)
);
--> statement-breakpoint
CREATE TABLE `ig_post_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`post_id` varchar(64) NOT NULL,
	`snapshot_time` datetime NOT NULL,
	`likes_count` int DEFAULT 0,
	`comments_count` int DEFAULT 0,
	`reach` int,
	`impressions` int,
	`saved` int,
	`raw_json` json,
	CONSTRAINT `ig_post_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ig_posts` (
	`post_id` varchar(64) NOT NULL,
	`account_id` varchar(64) NOT NULL,
	`created_time` datetime NOT NULL,
	`media_type` varchar(32),
	`permalink` text,
	`caption` text,
	`media_url` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ig_posts_post_id` PRIMARY KEY(`post_id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`report_type` enum('monthly','quarterly','annual') DEFAULT 'monthly',
	`status` enum('pending','generated','sent') DEFAULT 'pending',
	`file_url` text,
	`generated_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
