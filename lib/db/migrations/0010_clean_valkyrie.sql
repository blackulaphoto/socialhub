ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "actor_surface" text NOT NULL DEFAULT 'personal';
