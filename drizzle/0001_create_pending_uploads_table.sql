CREATE TYPE "public"."pending_status" AS ENUM('initiated', 'uploaded', 'processing', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "pending_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"filename" text,
	"content_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" "pending_status" DEFAULT 'initiated' NOT NULL
);
