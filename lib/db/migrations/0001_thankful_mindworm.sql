ALTER TABLE "artist_profiles" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "influences" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "availability_status" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "years_active" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "represented_by" text;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "open_for_commissions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "touring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "accepts_collaborations" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN "custom_fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "featured_type" text DEFAULT 'highlight' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "mood_preset" text DEFAULT 'sleek' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "layout_template" text DEFAULT 'portfolio' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "font_preset" text DEFAULT 'modern' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "enabled_modules" text[] DEFAULT '{"featured","about","media","posts","events","contact"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_profile_settings" ADD COLUMN "module_order" text[] DEFAULT '{"featured","about","media","posts","events","contact"}' NOT NULL;