# Artist Pages Evaluation

Last updated: 2026-04-08

This document reflects the current shipped artist-page experience in the source tree. It replaces older notes that described missing preview actions, broken tab persistence, and missing share metadata that are no longer accurate.

## Current strengths

- The creator setup now includes a starter path and a visual builder rather than only a large settings dump.
- Settings exposes both `Preview Artist Page` and `View Public Page`.
- Artist pages have stronger visual direction than the main app shell, including mood presets, hero treatments, media modules, and mobile tab handling.
- Share metadata exists globally and per artist page, and `/artists/:userId/share` provides a dedicated share surface.
- Current Playwright coverage verifies the builder shell, public-page action, mobile artist-page layout, and tab persistence.

## Current issues

### P0

- Dual identity is still the main UX tax.
- Posting behavior still depends on `activeIdentity` and `actorSurface`, so users need clearer explanation about what identity will publish a post.
- The app shell is still desktop-first on mobile, even though artist pages themselves are more mobile-aware.
- Artist-page posts were previously too low in the default content order.

### P1

- The main shell still feels more generic than the artist-page experience.
- Discovery has suggestions and filtering, but it still lacks a stronger featured or trending layer.
- Notifications and messages still rely on polling instead of true real-time delivery.

### P2

- No hashtag or topic system.
- No trending feed.
- No stories/live video layer.
- No creator analytics or custom slugs yet.

## P0 changes landed

- Home no longer force-resets artist identity back to personal when loading the feed.
- Feed composer now explains what identity will publish and what that means.
- Mobile layout now includes a bottom navigation bar with a direct compose entry point.
- Default artist-page module order now promotes posts earlier.
- Artist pages now surface a recent-updates spotlight above secondary sections.

## Files that define the current behavior

- `artifacts/social-app/src/pages/home.tsx`
- `artifacts/social-app/src/components/layout.tsx`
- `artifacts/social-app/src/pages/artist-profile.tsx`
- `artifacts/social-app/src/pages/settings.tsx`
- `tests/e2e/artist-pages.spec.ts`
