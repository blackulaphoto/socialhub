# Vercel Frontend Deployment

This repo is now wired so the React frontend can be deployed directly to Vercel from the repo root.

## Config file

The root [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) uses:

- install: `pnpm install --ignore-scripts`
- build: `pnpm --filter @workspace/social-app run build`
- output directory: `artifacts/social-app/dist/public`
- SPA rewrite: all non-`/api` routes go to `index.html`

## Required Vercel environment variables

Set this in the Vercel project:

```env
VITE_API_BASE_URL=https://your-api.up.railway.app
```

This is required because parts of the frontend still call the API directly from the browser using the configured base URL.

## Recommended Vercel project settings

- Framework preset: `Other`
- Root directory: repo root
- Install command: leave default or use `pnpm install --ignore-scripts`
- Build command: leave default because [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) defines it
- Output directory: leave default because [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) defines it

## Important note

Do not point `VITE_API_BASE_URL` at `localhost`.

For a public Vercel deploy to function, the backend must already be running on a public Railway URL.
