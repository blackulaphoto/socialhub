# Railway Backend Deployment

This repo is now wired so the Express API can be deployed directly to Railway from the repo root.

## What Railway runs

The root [railway.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/railway.json) config uses:

- build: `pnpm run railway:build`
- pre-deploy: `pnpm run railway:predeploy`
- start: `pnpm run railway:start`
- healthcheck: `/api/healthz`

Those scripts live in the root [package.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/package.json).

## Required Railway variables

Set these on the Railway service:

```env
DATABASE_URL=postgres://...
PORT=${{PORT}}
SESSION_SECRET=generate-a-long-random-secret
NODE_ENV=production
TRUST_PROXY=true
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-custom-domain.com
SESSION_COOKIE_NAME=socialhub.sid
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
SESSION_COOKIE_DOMAIN=
```

Notes:

- `PORT` is injected by Railway automatically.
- `SESSION_COOKIE_SAMESITE=none` is the right default if the frontend is on Vercel and the API is on Railway because that is a cross-site cookie flow.
- Leave `SESSION_COOKIE_DOMAIN` blank unless you move frontend and backend under a shared parent domain and know you need a custom cookie domain.

## Upload storage on Railway

This app currently stores uploaded media on disk. Railway containers are ephemeral, so you should attach a Railway Volume and point uploads at it.

Recommended variables:

```env
MEDIA_STORAGE_PROVIDER=local
LOCAL_UPLOAD_ROOT=/data/uploads
LOCAL_UPLOAD_PUBLIC_BASE_URL=https://your-api.up.railway.app
```

Then attach a volume mounted at `/data`.

The older `UPLOAD_ROOT` / `UPLOAD_PUBLIC_BASE_URL` env vars are still accepted as fallbacks.

If you skip this, uploads may disappear on redeploy or restart.

## Recommended service setup

1. Create a new Railway service from this GitHub repo.
2. Keep the service root at the repo root so Railway can see [railway.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/railway.json).
3. Add a Railway Postgres service and copy its `DATABASE_URL` into the API service.
4. Add the env vars above.
5. Attach a volume if you want uploads to persist.
6. Deploy.

## Local parity commands

These are the same commands Railway will rely on:

```powershell
pnpm run railway:build
pnpm run railway:predeploy
pnpm run railway:start
```

## Production behavior added in this repo

The API now supports:

- proxy-aware Express sessions in [app.ts](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/artifacts/api-server/src/app.ts)
- explicit CORS allowlists in [app.ts](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/artifacts/api-server/src/app.ts)
- secure/same-site cookie env control in [app.ts](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/artifacts/api-server/src/app.ts)
- configurable upload root/public URL in [uploads.ts](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/artifacts/api-server/src/lib/uploads.ts)

## Before adding Google auth

Wait until the API has a stable Railway URL. Then use that URL for Google OAuth callback registration, for example:

```text
https://your-api.up.railway.app/api/auth/google/callback
```
