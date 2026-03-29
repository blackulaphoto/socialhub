# Social Hub Rebuild Plan

This plan is for the current codebase in:

- `artifacts/api-server`
- `artifacts/social-app`
- `lib/db`

It assumes:

- PostgreSQL is used locally and in production
- We are upgrading the existing app, not rebuilding from scratch
- We want end-to-end usable features in each phase

## Current Baseline

Already present:

- Session auth
- User profiles
- Follow/unfollow
- Basic posts and likes
- Artist profiles and gallery
- Direct messages
- Search/discovery
- Minimal admin tools

Now added in the current upgrade branch:

- Extended network schema for richer profiles, creator settings, groups, events, inquiries, and custom feeds
- Startup schema creation for missing tables
- Expanded API routes for groups, events, richer feeds, and creator inquiries
- Frontend pages for custom feeds, groups, and events

Known remaining gaps:

- No cloud/object storage yet for uploaded media
- No performance/code-splitting cleanup yet
- Moderation analytics are lightweight, not full reporting/ops

## Phase 0: Local Environment and Database

Goal:

- Make local startup predictable on Windows without Docker

Tasks:

- Confirm local PostgreSQL service name, version, port, username, and password
- Create local database `social_hub`
- Verify the repo can connect using `DATABASE_URL`
- Add a Windows-friendly setup doc and startup commands
- Decide whether to support `.env` loading in code or keep shell-based env vars

Done in repo now:

- Added `.env.example`
- Added `.env*` ignore rules

Exit criteria:

- API boots locally against PostgreSQL
- Frontend can hit the API successfully

## Phase 1: Database and Migrations Hardening

Goal:

- Replace ad hoc schema drift with a clean migration workflow

Tasks:

- Convert startup DDL bootstrapping into proper Drizzle migrations
- Audit the new tables in `lib/db/src/schema/network.ts`
- Add indexes where feed, search, and group lookups need them
- Add seed data for creators, groups, posts, and events
- Decide how to handle environment-specific bootstrap behavior

Exit criteria:

- Fresh database setup is one repeatable sequence
- Existing schema can evolve safely without hidden startup mutations

## Phase 2: Auth, Profiles, and Creator Identity

Goal:

- Make profiles feel complete and usable for both users and creators

Tasks:

- Finish user profile editing for banner, city, links, accent color, featured content
- Normalize creator categories and validation
- Improve creator settings UX for action button type/label
- Add better follow stats and profile relationship states
- Add pinned post and featured content presentation polish

Exit criteria:

- Standard profile and creator profile both feel production-like
- Creator pages support distinct identity and contact intent

## Phase 3: Posts, Media, and Feed System

Goal:

- Make the feed system the core social product

Tasks:

- Add stronger post composer validation and media previews
- Improve support for image, video, and audio embeds
- Complete following/local/discovery/custom feed switching UX
- Refine feed filtering logic and empty states
- Add group-post creation directly from group pages
- Decide whether comments are in scope now or deferred

Exit criteria:

- Users can reliably post, browse, and switch between feeds
- Custom feeds are easy to save and revisit

## Phase 4: Messaging and Creator Inquiry Flows

Goal:

- Make contact and inquiry flows feel real, not bolted on

Tasks:

- Improve conversation creation when messaging from profiles
- Surface inquiry metadata better in message threads
- Add conversation search and better unread handling
- Ensure creator inquiry types map cleanly to action button selections
- Add UI polish for store/contact/hire/book variants

Exit criteria:

- Profile action button leads to a believable creator inquiry workflow
- Inbox clearly distinguishes inquiry messages from regular chat

## Phase 5: Groups and Community Layer

Goal:

- Make groups a meaningful social layer, not just a list page

Tasks:

- Add owner/admin moderation controls
- Improve group membership visibility and join flows
- Add group post composer
- Add public/private handling rules
- Improve group discovery by location/category/tag

Exit criteria:

- Groups support real recurring community usage
- Moderation basics work for owners/admins

## Phase 6: Events and Real-World Discovery

Goal:

- Tie the social graph to real appearances and scenes

Tasks:

- Improve event creation form and lineup linking
- Show upcoming events on creator profiles
- Add search/filtering by city and date
- Add event moderation in admin
- Add small event cards into discovery areas

Exit criteria:

- Events are useful enough for creators and local discovery

## Phase 7: Search, Discovery, and Navigation Polish

Goal:

- Make finding people, creators, groups, and events fast and useful

Tasks:

- Expand search into a unified discovery surface
- Add result sections for users, creators, groups, and events
- Improve ranking heuristics while keeping them simple and chronological/filter-based
- Refine navigation labels and cross-links between surfaces

Exit criteria:

- The app supports practical discovery by name, type, city, and tags

## Phase 8: Admin, Moderation, and Reliability

Goal:

- Make moderation and operations usable for a real prototype

Tasks:

- Finish admin tabs for users, posts, groups, and events
- Add lightweight reporting/flagging model if still in scope
- Add better error handling and loading states across the UI
- Add smoke tests for auth, profile fetch, feed fetch, group fetch, and events

Exit criteria:

- Admin can manage the main platform surfaces
- Critical flows have at least basic verification

## Phase 9: API Contract Cleanup

Goal:

- Bring the shared API artifacts back in sync with the live backend

Tasks:

- Update `lib/api-spec/openapi.yaml`
- Regenerate `lib/api-client-react` and `lib/api-zod`
- Replace temporary frontend direct fetches with generated hooks where appropriate
- Remove duplicate or obsolete types/routes

Exit criteria:

- Spec, generated client, and server behavior match again

## Immediate Next Steps

Recommended order from here:

1. Phase 10 performance and route code-splitting
2. stronger moderation actions/history on top of reports
3. optional cloud storage abstraction for uploaded media
4. deeper event/profile/feed polish after the architecture stabilizes

## Local Postgres Notes

Do not use Docker.

Expected local values from `.env.example`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/social_hub
PORT=3001
SESSION_SECRET=replace-this-with-a-real-secret
VITE_API_BASE_URL=http://localhost:3001
```

If PostgreSQL is installed but `psql` is not found, the likely issue is that PostgreSQL's `bin` directory is not on `PATH` for the current PowerShell session.
