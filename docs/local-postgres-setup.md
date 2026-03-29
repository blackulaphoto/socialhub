# Local PostgreSQL Setup (Windows, No Docker)

This repo now has a working repo-local PostgreSQL 18 cluster in:

- `.local/postgres-data`

It runs independently from the system PostgreSQL service and avoids the unknown system password problem.

Detected on this machine:

- Install path: `C:\Program Files\PostgreSQL\18`
- `psql.exe`: `C:\Program Files\PostgreSQL\18\bin\psql.exe`
- `createdb.exe`: `C:\Program Files\PostgreSQL\18\bin\createdb.exe`
- Service: `postgresql-x64-18` (left untouched)

## 1. Repo-local database

Current repo-local defaults:

```env
DATABASE_URL=postgres://postgres:socialhub@localhost:5433/social_hub
```

The repo-local cluster has already been initialized and `social_hub` has already been created.

To start it again later:

```powershell
.\scripts\start-local-postgres.ps1
```

To stop it:

```powershell
.\scripts\stop-local-postgres.ps1
```

## 2. Repo env file

The repo now includes a local `.env` at the root and an example in `.env.example`.

Default local values:

```env
DATABASE_URL=postgres://postgres:socialhub@localhost:5433/social_hub
PORT=3001
SESSION_SECRET=dev-secret-change-me
BASE_PATH=/
VITE_API_BASE_URL=http://localhost:3001
```

## 3. Run migrations

Before starting the API manually:

```powershell
pnpm run db:migrate
```

The migration workflow is documented in:

- `docs/database-migrations.md`

## 4. Start the API

From the repo root:

```powershell
pnpm run db:migrate
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

The API now loads `.env` and `.env.local` automatically.

Recommended Windows local startup:

```powershell
pnpm run start:api:local
```

This launcher:

- ensures repo-local PostgreSQL is running
- runs database migrations
- builds the API
- starts the API in the background on port `3001`
- waits for `/api/healthz` before reporting success
- writes logs to `.local/api-server.stdout.log` and `.local/api-server.stderr.log`

To stop it:

```powershell
pnpm run stop:api:local
```

## 5. Start the frontend

In another terminal:

```powershell
pnpm --filter @workspace/social-app run dev
```

Vite now loads `.env` and proxies `/api` to `VITE_API_BASE_URL`.

## 6. Verify the repo-local database manually

```powershell
$env:PGPASSWORD="socialhub"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5433 -d social_hub
```

## 7. If `psql` is not found globally

Either use the full executable path above, or add this to the current session:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
```

Then verify:

```powershell
psql --version
createdb --version
```
