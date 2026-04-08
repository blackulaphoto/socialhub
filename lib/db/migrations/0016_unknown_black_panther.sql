ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "wall_post_status" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "wall_post_target_user_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_wall_post_target_user_id_users_id_fk" FOREIGN KEY ("wall_post_target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;