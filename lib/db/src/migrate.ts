import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

type Journal = {
  entries: Array<{
    idx: number;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
};

async function ensureMigrationBaseline(migrationsFolder: string) {
  const migrationsTableExists = await pool.query<{
    exists: string | null;
  }>(`select to_regclass('drizzle.__drizzle_migrations') as exists`);

  if (migrationsTableExists.rows[0]?.exists) {
    return;
  }

  const usersTableExists = await pool.query<{ exists: string | null }>(
    `select to_regclass('public.users') as exists`,
  );

  if (!usersTableExists.rows[0]?.exists) {
    return;
  }

  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;
  const latestMigration = journal.entries.at(-1);

  if (!latestMigration) {
    return;
  }

  const sqlPath = path.join(migrationsFolder, `${latestMigration.tag}.sql`);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex");

  await pool.query(`create schema if not exists drizzle`);
  await pool.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
  await pool.query(
    `insert into drizzle.__drizzle_migrations ("hash", "created_at") values ($1, $2)`,
    [hash, latestMigration.when],
  );
  console.log(`Baselined existing schema with migration ${latestMigration.tag}`);
}

async function ensureArtistProfileBrandingColumns() {
  const result = await pool.query<{ column_name: string }>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'artist_profiles'
      and column_name in ('avatar_url', 'banner_url')
  `);

  const existing = new Set(result.rows.map((row) => row.column_name));
  const statements: string[] = [];

  if (!existing.has("avatar_url")) {
    statements.push(`alter table "artist_profiles" add column "avatar_url" text`);
  }
  if (!existing.has("banner_url")) {
    statements.push(`alter table "artist_profiles" add column "banner_url" text`);
  }

  for (const statement of statements) {
    await pool.query(statement);
  }

  if (statements.length > 0) {
    console.log("Applied artist profile branding compatibility patch");
  }
}

async function ensureCreatorProfileBuilderColumns() {
  const result = await pool.query<{ column_name: string }>(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'creator_profile_settings'
      and column_name in (
        'page_type',
        'page_archetype',
        'page_status',
        'featured_content',
        'link_items',
        'service_items',
        'pricing_summary',
        'turnaround_info',
        'accent_color',
        'background_style',
        'light_theme_variant',
        'section_configs'
      )
  `);

  const existing = new Set(result.rows.map((row) => row.column_name));
  const statements: string[] = [];

  if (!existing.has("page_type")) statements.push(`alter table "creator_profile_settings" add column "page_type" text default 'creator' not null`);
  if (!existing.has("page_archetype")) statements.push(`alter table "creator_profile_settings" add column "page_archetype" text default 'business' not null`);
  if (!existing.has("page_status")) statements.push(`alter table "creator_profile_settings" add column "page_status" text default 'published' not null`);
  if (!existing.has("featured_content")) statements.push(`alter table "creator_profile_settings" add column "featured_content" jsonb`);
  if (!existing.has("link_items")) statements.push(`alter table "creator_profile_settings" add column "link_items" jsonb default '[]'::jsonb not null`);
  if (!existing.has("service_items")) statements.push(`alter table "creator_profile_settings" add column "service_items" jsonb default '[]'::jsonb not null`);
  if (!existing.has("pricing_summary")) statements.push(`alter table "creator_profile_settings" add column "pricing_summary" text`);
  if (!existing.has("turnaround_info")) statements.push(`alter table "creator_profile_settings" add column "turnaround_info" text`);
  if (!existing.has("accent_color")) statements.push(`alter table "creator_profile_settings" add column "accent_color" text default '#8b5cf6'`);
  if (!existing.has("background_style")) statements.push(`alter table "creator_profile_settings" add column "background_style" text default 'soft-glow' not null`);
  if (!existing.has("light_theme_variant")) statements.push(`alter table "creator_profile_settings" add column "light_theme_variant" text default 'studio' not null`);
  if (!existing.has("section_configs")) statements.push(`alter table "creator_profile_settings" add column "section_configs" jsonb default '{}'::jsonb not null`);

  for (const statement of statements) {
    await pool.query(statement);
  }

  if (statements.length > 0) {
    console.log("Applied creator page builder compatibility patch");
  }
}

async function main() {
  const migrationsFolder = path.resolve(import.meta.dirname, "..", "migrations");

  if (!fs.existsSync(migrationsFolder)) {
    throw new Error(
      `Migrations directory not found at ${migrationsFolder}. Run "pnpm --filter @workspace/db run generate" first.`,
    );
  }

  await ensureMigrationBaseline(migrationsFolder);
  await migrate(db, { migrationsFolder });
  await ensureArtistProfileBrandingColumns();
  await ensureCreatorProfileBuilderColumns();
  await pool.end();
  console.log(`Applied migrations from ${migrationsFolder}`);
}

main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
