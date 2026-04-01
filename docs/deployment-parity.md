# Deployment Parity Checklist

Use this when a bug happens on Railway/Vercel but not locally, or locally but not in production.

The goal is to verify the app under conditions that are closer to the deployed stack:

- built frontend, not `vite dev`
- same-origin `/api` and `/uploads` proxy behavior
- local API serving the same backend code that Railway runs

## Local Production-Preview Workflow

Start the backend:

```powershell
pnpm run start:api:local
```

Start the local production-style web preview:

```powershell
pnpm run start:web:preview:local
```

This does three things:

1. builds the frontend in production mode
2. serves the built frontend from `artifacts/social-app/dist/public`
3. proxies `/api/*` and `/uploads/*` to `http://localhost:3001`

Open:

```text
http://localhost:4173
```

Stop it with:

```powershell
pnpm run stop:web:preview:local
```

## Verification Order

Run these checks in this order after any meaningful change:

1. `pnpm run typecheck`
2. `pnpm run start:api:local`
3. `pnpm run start:web:preview:local`
4. verify the app in `http://localhost:4173`
5. only then compare against the deployed app

## High-Risk Flows To Verify Every Time

### Auth and Session

- login
- register
- logout
- refresh after login
- save profile after login

### Identity Switching

- switch from personal to artist page
- switch back to personal
- open correct edit surface for current identity

### Profile and Artist Page

- save personal profile
- save creator page
- `Save And View Artist Page`
- avatar upload
- banner upload
- public page matches preview closely enough

### Feed and Posting

- open create-post modal
- post as personal
- post as artist page
- upload image
- image-only post
- comments load

### Discovery and Search

- smart location picker suggestions
- search by creator name
- search by city/state
- discover suggestions

### Notifications and Messages

- notification badge loads
- activity summary loads
- inbox opens
- start a new message from inbox

## Common Local-vs-Deploy Mismatch Sources

### 1. Dev server vs built app

`vite dev` is more forgiving than the built app. Always reproduce UI bugs in the preview server before assuming the fix is good.

### 2. Session behavior

Railway hobby restarts can drop in-memory sessions. Local may appear stable while deploy loses auth unexpectedly.

### 3. Upload persistence

Local disk and Railway hobby storage do not behave the same way. Old uploaded files may disappear on deploy if storage is ephemeral.

### 4. Env drift

The frontend may be using different `VITE_API_BASE_URL` assumptions locally vs deployed.

### 5. Data drift

Local seeded data and deployed DB state often differ. If a bug depends on specific records, verify the deployed data too.

## Before Pushing

Minimum pre-push gate for deploy-sensitive changes:

```powershell
pnpm run typecheck
pnpm run start:api:local
pnpm run start:web:preview:local
```

Then manually verify:

- auth
- profile save
- artist page save
- artist page switch
- one image upload
- one search query

## Deployed Verification

After deploy, verify:

- `/api/healthz`
- login
- save profile
- save artist page
- upload image
- search creator page
- notifications/messages header load
