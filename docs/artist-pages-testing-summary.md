# Artist Pages Test Summary

Last updated: 2026-04-08

This summary tracks the current artist-page Playwright coverage. It replaces older summary notes that referred to outdated failures such as a missing public preview action and guaranteed state loss on settings tab changes.

## Covered flows

- Creator settings exposes the visual builder shell.
- Creator settings keeps page name when switching tabs.
- Creator settings offers a public-page action.
- Discover exposes creator browse filters.
- Discover promotes artist-page creation to non-artists.
- Artist identity carries into the feed composer with explicit publishing guidance.
- Artist page loads on mobile with stats, tabs, and bottom navigation.
- Artist mobile gallery tab shows gallery content directly.

## What these tests are meant to protect

- The builder stays discoverable and usable.
- Public-page preview and publish-adjacent actions remain visible.
- Identity behavior stays explicit when users move between artist pages and the main feed.
- Mobile users keep direct access to navigation and compose actions.
- Artist pages continue to render a mobile-first content tab structure.

## Source of truth

- `tests/e2e/artist-pages.spec.ts`
