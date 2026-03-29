ALTER TABLE "user_profile_details" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "user_profile_details" ADD COLUMN "work" text;--> statement-breakpoint
ALTER TABLE "user_profile_details" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "user_profile_details" ADD COLUMN "about" text;--> statement-breakpoint
ALTER TABLE "user_profile_details" ADD COLUMN "interests" text[] DEFAULT '{}' NOT NULL;