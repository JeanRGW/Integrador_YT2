ALTER TABLE "pending_uploads" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "pending_uploads" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "pending_uploads" ADD COLUMN "visibility" "visibility" DEFAULT 'public';