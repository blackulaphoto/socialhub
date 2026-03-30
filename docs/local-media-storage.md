# Local Media Storage

The app currently uses a local media storage provider.

That is intentional for this stage. Uploads stay on disk until promotion/deployment needs justify moving to object storage.

## Current provider

```env
MEDIA_STORAGE_PROVIDER=local
```

## Local provider paths

If you do not set anything else, uploads go to:

- `.local/uploads`

You can override that with:

```env
LOCAL_UPLOAD_ROOT=C:\path\to\uploads
```

The older `UPLOAD_ROOT` env var is still supported as a fallback.

## Public URL base

By default, upload URLs are built from the incoming request origin.

You can override that with:

```env
LOCAL_UPLOAD_PUBLIC_BASE_URL=http://localhost:3001
```

The older `UPLOAD_PUBLIC_BASE_URL` env var is still supported as a fallback.

## Why this exists

The upload code now goes through a provider layer instead of assuming one hardcoded local path. That keeps local storage active now, but makes it easier to swap in object storage later without rewriting the upload route or frontend upload flow.

## What stays in Postgres

Postgres stores media metadata and URLs, not the image binaries themselves.

That means:

- user/profile/post/group/event records still live in Postgres
- uploaded files stay on disk for now
- later, the provider can be changed to external object storage while keeping the same app-level media references
