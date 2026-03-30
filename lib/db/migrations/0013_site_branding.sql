CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "site_name" text DEFAULT 'ArtistHub' NOT NULL,
  "logo_url" text,
  "favicon_url" text,
  "updated_by_user_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

INSERT INTO "site_settings" ("id", "site_name", "logo_url", "favicon_url")
VALUES (1, 'ArtistHub', '/brand-mark.png', '/favicon.png')
ON CONFLICT ("id") DO NOTHING;
