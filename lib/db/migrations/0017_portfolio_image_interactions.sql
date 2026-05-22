ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "contributor_user_ids" integer[] DEFAULT ARRAY[]::integer[] NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gallery_item_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"gallery_item_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "gallery_item_likes" ADD CONSTRAINT "gallery_item_likes_gallery_item_id_gallery_items_id_fk" FOREIGN KEY ("gallery_item_id") REFERENCES "public"."gallery_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "gallery_item_likes" ADD CONSTRAINT "gallery_item_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "gallery_item_likes_gallery_item_id_user_id_unique" ON "gallery_item_likes" USING btree ("gallery_item_id","user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "gallery_item_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"gallery_item_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "gallery_item_comments" ADD CONSTRAINT "gallery_item_comments_gallery_item_id_gallery_items_id_fk" FOREIGN KEY ("gallery_item_id") REFERENCES "public"."gallery_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "gallery_item_comments" ADD CONSTRAINT "gallery_item_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
