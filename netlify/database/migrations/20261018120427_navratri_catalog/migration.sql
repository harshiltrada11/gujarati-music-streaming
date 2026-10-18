CREATE TABLE "catalog" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"channel" text NOT NULL,
	"thumbnail" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"language" text,
	"category" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_library" (
	"user_id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_library" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app_state" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" text PRIMARY KEY,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" text NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"message" text
);
--> statement-breakpoint
ALTER TABLE "sync_runs" ENABLE ROW LEVEL SECURITY;