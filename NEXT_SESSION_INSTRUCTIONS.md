# Next Session: Artist Page Posts System Enhancement

## Context
We've successfully completed:
1. ✅ Featured content system improvements (gallery/video/audio pickers, event/post selectors)
2. ✅ Section visibility logic (empty sections now hide automatically)
3. ✅ Location dropdown in creator page builder

## Current Task: Posts System Enhancement

### Requirements Overview
Implement a comprehensive wall posting system for artist pages where:
- Visitors can post on artist walls (pending approval)
- Artists see all their posts: personal posts, artist page posts, wall posts, and reposts
- Posts section always visible with appropriate composer

### Detailed Implementation Plan

---

## Phase 1: Database Schema Updates

### Add Approval Status to Posts Table

**File**: `lib/api-zod/src/generated/schema/posts.ts` (or equivalent schema file)

Add new fields to posts table:
```typescript
{
  // Existing fields...
  wallPostStatus?: 'pending' | 'approved' | 'denied' | null;
  wallPostTargetUserId?: number | null; // The artist whose wall this was posted on
}
```

**Migration needed**: Add columns to `posts` table in database.

---

## Phase 2: API Endpoints

### 2.1 Create Wall Post Endpoint
**File**: `lib/api/src/routes/posts.ts`

```typescript
POST /api/users/:userId/wall-posts
- Creates a post on another user's wall
- Sets wallPostStatus to 'pending'
- Sets wallPostTargetUserId to the artist's ID
- Returns the created post
```

### 2.2 Get Pending Wall Posts
```typescript
GET /api/users/:userId/wall-posts/pending
- Returns all pending wall posts for the authenticated user (artist)
- Requires user to be the wallPostTargetUserId
- Used for moderation page
```

### 2.3 Approve/Deny Wall Post
```typescript
PATCH /api/wall-posts/:postId/moderate
Body: { action: 'approve' | 'deny' }
- Updates wallPostStatus
- Only artist (wallPostTargetUserId) can moderate
```

### 2.4 Get Artist Page Posts (Enhanced)
```typescript
GET /api/users/:userId/artist-posts
- Returns combined feed:
  1. User's own posts (surface: 'artist')
  2. User's personal posts (surface: 'feed')
  3. Approved wall posts (wallPostTargetUserId = userId AND wallPostStatus = 'approved')
  4. User's reposts (add repost tracking)
- Sorted by createdAt DESC
```

---

## Phase 3: Frontend Components

### 3.1 Wall Post Composer
**File**: `artifacts/social-app/src/components/wall-post-composer.tsx` (NEW)

Component for visitors to post on artist walls:
```tsx
<WallPostComposer
  targetUserId={artistId}
  targetUserName={artistName}
  onSuccess={() => showPendingToast()}
/>
```

Features:
- Shows "Post on [Artist Name]'s page"
- On submit: calls POST /api/users/:userId/wall-posts
- On success: Shows toast "Your post is pending approval"

### 3.2 Pending Posts Review Page
**File**: `artifacts/social-app/src/pages/pending-wall-posts.tsx` (NEW)

Full page for artists to review pending posts:
```tsx
<PendingWallPostsPage />
```

Features:
- Lists all pending wall posts
- Each post has [Approve] [Deny] buttons
- Calls PATCH /api/wall-posts/:postId/moderate
- Removes from list on action

### 3.3 Update Artist Profile Posts Section
**File**: `artifacts/social-app/src/pages/artist-profile.tsx`

Update `renderPosts()` function:

**For Own Artist Page** (isOwnArtistPage = true):
- Show existing composer for artist page posts
- Keep "Use Artist Page" / "Personal Profile" toggle

**For Visitors**:
```tsx
{!isOwnArtistPage && (
  <WallPostComposer
    targetUserId={userId}
    targetUserName={artistPageName}
  />
)}
```

**Feed Display** (for both owner and visitors):
- Fetch from GET /api/users/:userId/artist-posts (enhanced endpoint)
- Show all posts (own posts, wall posts, reposts)
- Wall posts show attribution: "[Visitor Name] posted on [Artist Name]'s page"

### 3.4 Pending Posts Notification
**File**: `artifacts/social-app/src/components/notifications-dropdown.tsx` (or equivalent)

Add notification type for pending wall posts:
- Icon badge showing count
- Click navigates to `/pending-wall-posts` page

---

## Phase 4: Repost Mechanism

### 4.1 Database for Reposts
Add `reposts` table or add to posts:
```typescript
{
  userId: number; // Who reposted
  originalPostId: number; // The post being reposted
  createdAt: timestamp;
}
```

### 4.2 Repost Button Component
**File**: `artifacts/social-app/src/components/feed-post-card.tsx`

Check if repost button exists and is wired correctly:
- Should call POST /api/posts/:postId/repost
- Should update repost count
- Should add to user's artist page feed

### 4.3 Feed Display for Reposts
In feed rendering:
- Show "🔁 [User] reposted" attribution
- Display original post content below

---

## Phase 5: Posts Section Always Visible

### Update Section Visibility Logic
**File**: `artifacts/social-app/src/pages/artist-profile.tsx`

Current code filters sections:
```typescript
const visibleSections = builderMeta.sections
  .filter((section) => section.visible && sections[section.key])
  .map((section) => section.key);
```

Update to ALWAYS include 'posts':
```typescript
const visibleSections = builderMeta.sections
  .filter((section) => {
    // Posts section always visible
    if (section.key === 'posts') return true;
    // Other sections only if visible and have content
    return section.visible && sections[section.key];
  })
  .map((section) => section.key);
```

Ensure `renderPosts()` never returns null - always returns composer or feed.

---

## Implementation Checklist

### Backend (API)
- [ ] Add database migration for `wallPostStatus` and `wallPostTargetUserId`
- [ ] Create POST /api/users/:userId/wall-posts endpoint
- [ ] Create GET /api/users/:userId/wall-posts/pending endpoint
- [ ] Create PATCH /api/wall-posts/:postId/moderate endpoint
- [ ] Enhance GET /api/users/:userId/artist-posts to include wall posts
- [ ] Add reposts table/fields
- [ ] Create POST /api/posts/:postId/repost endpoint

### Frontend Components
- [ ] Create WallPostComposer component
- [ ] Create PendingWallPostsPage
- [ ] Update artist-profile.tsx renderPosts() with visitor composer
- [ ] Add pending posts notification badge
- [ ] Update section visibility to always show Posts
- [ ] Verify repost button functionality in FeedPostCard

### Testing
- [ ] Test visitor posting on artist wall → pending status
- [ ] Test pending approval toast shows for visitors
- [ ] Test artist can see pending posts page
- [ ] Test approve/deny actions work
- [ ] Test approved posts show on artist page
- [ ] Test denied posts don't show
- [ ] Test artist's own posts show on artist page
- [ ] Test artist's personal feed posts show on artist page
- [ ] Test reposts show on artist page
- [ ] Test Posts section never hides

---

## Key Files to Modify

1. **Database Schema**: `lib/api-zod/src/generated/schema/posts.ts`
2. **API Routes**: `lib/api/src/routes/posts.ts`
3. **Artist Profile Page**: `artifacts/social-app/src/pages/artist-profile.tsx`
4. **New Wall Composer**: `artifacts/social-app/src/components/wall-post-composer.tsx`
5. **New Pending Page**: `artifacts/social-app/src/pages/pending-wall-posts.tsx`
6. **Feed Post Card**: `artifacts/social-app/src/components/feed-post-card.tsx`
7. **Notifications**: `artifacts/social-app/src/components/notifications-dropdown.tsx`

---

## Success Criteria

✅ Visitors can post on any artist wall
✅ Visitor sees "Your post is pending approval" toast
✅ Artist gets notification for pending posts
✅ Artist can approve/deny from pending posts page
✅ Approved posts appear on artist page feed
✅ Artist page feed shows: own posts + wall posts + reposts
✅ Wall posts show "[Name] posted on [Artist]'s page"
✅ Posts section never hides (always shows composer or feed)
✅ Repost button works and adds to artist page feed

---

## Notes

- **Permissions**: Only the wallPostTargetUserId can approve/deny
- **Feed Attribution**: Use post metadata to show different types (own, wall, repost)
- **Toast Messages**:
  - Visitor posts: "Your post is pending approval"
  - Approve: "Post approved and published"
  - Deny: "Post denied"
- **Always Visible**: Posts section should show even when empty (with composer)
- **Mobile Tabs**: Ensure Posts tab always appears in mobile navigation

---

## Current Codebase State

- Featured content system working with smart pickers
- Section visibility logic implemented (empty sections hidden)
- Location dropdown integrated in creator page builder
- TypeScript checks passing
- All changes committed and pushed to git
