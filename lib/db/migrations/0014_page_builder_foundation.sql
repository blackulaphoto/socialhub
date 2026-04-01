ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "page_type" text DEFAULT 'creator' NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "page_archetype" text DEFAULT 'business' NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "page_status" text DEFAULT 'published' NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "featured_content" jsonb;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "link_items" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "service_items" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "pricing_summary" text;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "turnaround_info" text;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "accent_color" text DEFAULT '#8b5cf6';

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "background_style" text DEFAULT 'soft-glow' NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "light_theme_variant" text DEFAULT 'studio' NOT NULL;

ALTER TABLE "creator_profile_settings"
ADD COLUMN IF NOT EXISTS "section_configs" jsonb DEFAULT '{}'::jsonb NOT NULL;
