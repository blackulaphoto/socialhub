# Database Migrations

The repo now uses explicit Drizzle migrations from:

- `lib/db/migrations`

The API no longer creates or alters tables on startup.

## Commands

Generate a new migration after schema changes:

```powershell
pnpm run db:generate
```

Apply migrations:

```powershell
pnpm run db:migrate
```

Seed local data after migrations:

```powershell
pnpm --filter @workspace/scripts run seed
```

## Local startup flow

`pnpm run start:api:local` now does this in order:

1. starts repo-local PostgreSQL
2. runs DB migrations
3. builds the API
4. starts the API

## Existing local databases

If your local database was created by the old runtime bootstrap path, the new migrate script will baseline-stamp the current schema into `drizzle.__drizzle_migrations` once, then use normal migrations after that.

That avoids dropping local data just to move into the migration-based workflow.
