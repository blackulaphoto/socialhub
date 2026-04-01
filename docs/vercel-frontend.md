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
VITE_API_BASE_URL=https://your-frontend.vercel.app
```

The frontend should use its own Vercel origin in production so browser calls stay same-origin and Vercel rewrites proxy `/api/*` and `/uploads/*` to Railway.

## Recommended Vercel project settings

- Framework preset: `Other`
- Root directory: repo root
- Install command: leave default or use `pnpm install --ignore-scripts`
- Build command: leave default because [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) defines it
- Output directory: leave default because [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) defines it

## Important notes

- Do not point `VITE_API_BASE_URL` at `localhost` for a public deploy.
- The Vercel domain should be the configured frontend base URL.
- [vercel.json](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/vercel.json) proxies `/api/*` and `/uploads/*` to Railway.
- For local production-style testing, use [deployment-parity.md](/c:/Users/brandon/Downloads/Social-Hub/Social-Hub/docs/deployment-parity.md).
