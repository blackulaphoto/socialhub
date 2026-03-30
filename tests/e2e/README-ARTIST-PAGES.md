# Artist Pages E2E Test Suite

## Overview

This test suite validates critical user workflows for the artist pages feature and **exposes UX complexity issues** documented in [docs/artist-pages-evaluation.md](../../docs/artist-pages-evaluation.md).

## Purpose

These tests serve two purposes:

1. **Regression Testing**: Ensure core artist page functionality works
2. **UX Issue Detection**: Highlight pain points, confusion, and friction in user workflows

## Running the Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run only artist page tests
pnpm test:e2e artist-pages

# Run with UI mode for debugging
pnpm dlx playwright test --ui

# Run specific test
pnpm dlx playwright test -g "new user encounters overwhelming settings form"
```

## Prerequisites

- **API server** must be running on `http://localhost:3001`
- **Frontend app** must be running on `http://localhost:5173`
- **Database** must be seeded with admin user (`admin@socialhub.local` / `admin123`)

The test suite will automatically start the API server via `global-setup.ts` if `PLAYWRIGHT_SKIP_API_BOOT` is not set.

## Test Categories

### 1. Artist Page Creation Flow

Tests the initial experience of creating an artist page.

#### `new user encounters overwhelming settings form`
- **Purpose**: Expose the 45+ field complexity problem
- **Expected Failure**: User sees 20+ input fields immediately with no guidance
- **UX Issue**: Settings form complexity (Grade D in evaluation)
- **What It Tests**:
  - User registers and completes onboarding
  - User clicks "Create Artist Page" CTA
  - User lands on `/settings?tab=creator`
  - Test counts visible input fields (should find 15+)
  - User fills minimal fields and saves
  - **Problem**: No redirect, no progress indicator, user is lost

#### `user loses work when switching tabs in settings`
- **Purpose**: Expose Bug #1 - Settings state loss
- **Expected Behavior**: Values persist across tab switches
- **Potential Failure**: `useState` initialization bug causes data loss
- **UX Issue**: Form state management
- **What It Tests**:
  - User fills multiple fields in Creator tab
  - User switches to Photos tab
  - User switches back to Creator tab
  - Test asserts values still present

#### `user cannot find preview button`
- **Purpose**: Expose missing preview mode feature
- **Expected Failure**: No "Preview" or "View Page" button exists
- **UX Issue**: Feature discoverability (Grade D)
- **What It Tests**:
  - User on settings page
  - Test searches for preview/view buttons
  - Expects 0 results (documenting the gap)

### 2. Dual Identity Confusion

Tests the controversial dual-identity system (personal vs artist posting).

#### `user confused by personal vs artist posting modes`
- **Purpose**: Expose the F-grade dual identity UX problem
- **Expected Confusion**: User doesn't understand which profile they're using
- **UX Issue**: Dual identity system complexity
- **What It Tests**:
  - User logs in with artist page enabled
  - User sees identity toggle in header
  - User opens post composer
  - Test verifies "Posting as personal" badge exists but is NOT clickable
  - User must find header toggle (not obvious)
  - User switches to "Artist Page" mode
  - User creates post
  - **Problem**: Post only visible on `/artists/:id`, not personal feed

#### `user cannot find artist post on personal profile`
- **Purpose**: Expose split-feed confusion
- **Expected Failure**: Post not visible on personal profile
- **UX Issue**: Dual identity creates split audiences
- **What It Tests**:
  - User posts as "Artist Page"
  - User navigates to personal profile (`/profile/:id`)
  - Test asserts post NOT visible (separate feeds)
  - User must navigate to `/artists/:id` to see post
  - **Problem**: Friends on personal profile never see artist posts

### 3. Artist Discovery Workflow

Tests the browsing/discovery experience.

#### `visitor can discover and view artist page`
- **Purpose**: Validate basic discovery flow works
- **Expected Success**: User can filter and view artists
- **What It Tests**:
  - User navigates to `/discover`
  - Search filters visible (tags, category, location)
  - User selects "Music" category
  - User clicks first artist card
  - User lands on `/artists/:id`
  - Artist page renders correctly

#### `visitor sees call-to-action on discover page`
- **Purpose**: Validate CTA for non-artists
- **Expected Success**: Promotion card visible
- **What It Tests**:
  - New user registers without artist page
  - User navigates to `/discover`
  - Test verifies "Turn your profile into a real artist page" CTA visible
  - "Create Artist Page" button present

### 4. Booking Inquiry Flow

Tests the inquiry/contact form on artist pages.

#### `visitor can submit booking inquiry`
- **Purpose**: Validate inquiry form submission
- **Expected Success**: User can send inquiry
- **What It Tests**:
  - Artist configures booking email in settings
  - Artist sets primary action to "booking"
  - Visitor visits artist page
  - Visitor clicks booking button
  - Dialog opens with inquiry form
  - Visitor fills form and submits
  - Success message appears

#### `action button routing logic handles external URLs`
- **Purpose**: Expose Bug #3 - Incorrect routing for shop/store actions
- **Expected Failure**: Shop button opens dialog instead of external link
- **UX Issue**: Action button logic
- **What It Tests**:
  - Artist sets primary action URL to `https://shop.example.com`
  - Artist sets label to "Shop My Work"
  - Visitor clicks "Shop My Work" button
  - **Correct**: Opens external link in new tab
  - **Bug #3**: Opens empty dialog instead
  - Test detects which behavior occurs

### 5. Gallery Management

Tests media gallery upload experience.

#### `artist can add gallery item but gets no upload feedback`
- **Purpose**: Expose Bug #2 - Missing upload progress indicator
- **Expected Failure**: No loading spinner during upload
- **UX Issue**: Upload feedback gaps (Medium severity)
- **What It Tests**:
  - User navigates to `/settings?tab=gallery`
  - User pastes image URL
  - User clicks "Add Item"
  - Test looks for loading spinner (expects 0)
  - **Problem**: 3+ second wait with no feedback
  - Image eventually appears

### 6. Settings Persistence

Tests data persistence across sessions.

#### `artist settings persist across page reloads`
- **Purpose**: Validate settings save correctly
- **Expected Success**: Values persist after reload
- **What It Tests**:
  - User fills artist settings
  - User saves changes
  - User reloads page
  - Test asserts values still present in form

### 7. Mobile Experience

Tests responsive design on mobile viewports.

#### `settings form is usable on mobile`
- **Purpose**: Validate mobile responsiveness
- **Known Issue**: Desktop preview card hidden on mobile
- **What It Tests**:
  - User on iPhone SE viewport (375x667)
  - User navigates to settings
  - Test verifies preview card hidden (documented limitation)
  - Test verifies form fields still accessible
  - Save button visible after scrolling

#### `artist discovery works on mobile`
- **Purpose**: Validate discover page on mobile
- **Expected Success**: Filters stack vertically, cards display
- **What It Tests**:
  - User on mobile viewport
  - User navigates to `/discover`
  - Filters visible and functional
  - Artist cards display in single column
  - Artist page renders correctly

### 8. Complexity Metrics

Tests that measure and validate evaluation claims.

#### `count total settings inputs to validate 45+ field claim`
- **Purpose**: Quantitatively validate the "45+ fields" claim from evaluation
- **What It Tests**:
  - Navigates to Profile, Creator, Photos tabs
  - Counts all visible input/textarea/select elements
  - Logs breakdown per tab
  - Asserts Creator tab has 15+ inputs (partial validation)
- **Expected Output**:
  ```
  Total input fields across settings: 40-50
  - Profile tab: 12-15
  - Creator tab: 20-30
  - Photos tab: 5-8
  ```

#### `measure time-to-first-artist-page for new user`
- **Purpose**: Quantify onboarding time
- **Evaluation Claim**: 15-30 minutes for full setup
- **What It Tests**:
  - Times the entire flow: register → onboard → create artist page
  - Fills only minimal required fields
  - Logs time in seconds
- **Expected Results**:
  - Minimal setup: 10-20 seconds (automated)
  - Real user with customization: 15-30 minutes
  - **Target with wizard**: <60 seconds

## Expected Test Results

### Tests That Should PASS ✅
- `visitor can discover and view artist page`
- `visitor sees call-to-action on discover page`
- `visitor can submit booking inquiry`
- `artist settings persist across page reloads`
- `settings form is usable on mobile`
- `artist discovery works on mobile`

### Tests That May FAIL or Expose Issues ⚠️
- `user loses work when switching tabs in settings` (Bug #1)
- `artist can add gallery item but gets no upload feedback` (Bug #2)
- `action button routing logic handles external URLs` (Bug #3)

### Tests That Document UX Problems 📊
- `new user encounters overwhelming settings form` (Complexity issue)
- `user cannot find preview button` (Missing feature)
- `user confused by personal vs artist posting modes` (Dual identity)
- `user cannot find artist post on personal profile` (Split feeds)
- `count total settings inputs to validate 45+ field claim` (Metrics)
- `measure time-to-first-artist-page for new user` (Metrics)

## How These Tests Map to Evaluation Findings

| Test | Evaluation Section | Grade | Issue Type |
|------|-------------------|-------|------------|
| `new user encounters overwhelming settings form` | Settings Form Complexity | D | Overwhelming |
| `user loses work when switching tabs` | Critical Bug #1 | High | Data Loss |
| `user cannot find preview button` | Missing Critical Features | - | Feature Gap |
| `user confused by personal vs artist posting modes` | Dual Identity System | F | Confusing |
| `user cannot find artist post on personal profile` | Dual Identity System | F | Confusing |
| `action button routing logic handles external URLs` | Critical Bug #3 | High | Broken Flow |
| `artist can add gallery item but gets no upload feedback` | Critical Bug #2 | Medium | Feedback Gap |
| `count total settings inputs` | Settings Breakdown | - | Validation |
| `measure time-to-first-artist-page` | Competitor Comparison | - | Metrics |

## Interpreting Test Failures

### If `user loses work when switching tabs` fails:
- **Root Cause**: `useState` initialization only runs on mount ([settings.tsx:143](../../artifacts/social-app/src/pages/settings.tsx))
- **Impact**: Users lose work when navigating settings
- **Fix**: Use `useEffect` to sync state when profile data changes, or implement auto-save

### If `action button routing logic` fails:
- **Root Cause**: Incorrect logic at [artist-profile.tsx:911](../../artifacts/social-app/src/pages/artist-profile.tsx)
- **Impact**: Shop/Store buttons open dialog instead of external link
- **Fix**: Check `primaryActionUrl` existence before deciding dialog vs navigation

### If `artist can add gallery item but gets no upload feedback` fails:
- **Root Cause**: Missing `uploading.gallery` state display
- **Impact**: Users think upload failed (3+ second blank wait)
- **Fix**: Add loading spinner with `{uploading.gallery && <Spinner />}`

### If complexity metrics show 45+ fields:
- **Validation**: Confirms evaluation finding
- **Impact**: Users overwhelmed, 15-30 min setup time
- **Fix**: Implement onboarding wizard (Option B) or template system (Option C)

## Recommended Improvements Based on Test Results

### Priority 0 (Must-Fix)
1. **Add onboarding wizard** → Reduces 45 fields to 3-5 per step
2. **Fix state loss bug** → Auto-save or proper state management
3. **Add upload progress** → Show spinner during gallery uploads
4. **Fix action button routing** → External URLs should open in new tab
5. **Add preview button** → Let users see what visitors see

### Priority 1 (Should-Fix)
6. **Simplify field count** → Hide advanced fields behind "Show More"
7. **Add template picker** → 5 starter templates for common creators
8. **Improve mobile** → Touch-friendly gallery, better preview
9. **Add tooltips** → Explain mood presets, layout templates
10. **Dashboard analytics** → Show page views, inquiry counts

### Priority 2 (Consider)
11. **Merge dual identity** → Single profile with "Creator Mode" toggle (like Instagram Business)
12. **Custom URL slugs** → `/artists/dj-nocturne` instead of `/artists/42`
13. **Import wizard** → Auto-populate from Linktree/Bandcamp URLs

## Success Criteria

If the following improvements are made, these metrics should improve:

| Metric | Current (Est.) | Target |
|--------|---------------|--------|
| Artist page completion rate | ~30% | >70% |
| Time to first publish | 15-30 min | <5 min |
| Settings form abandonment | ~50% | <20% |
| Post identity confusion (support tickets) | High | Zero |
| Mobile artist page creation | ~10% | >40% |

## Running Tests in CI/CD

```yaml
# .github/workflows/e2e-artist-pages.yml
name: E2E Artist Pages
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: socialhub
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm test:e2e artist-pages
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Further Reading

- [Artist Pages Evaluation](../../docs/artist-pages-evaluation.md) - Full UX analysis
- [Heuristic Evaluation Scores](../../docs/artist-pages-evaluation.md#-heuristic-evaluation-scores) - 4.1/10 average
- [Competitor Comparison](../../docs/artist-pages-evaluation.md#-what-competitors-do-better) - Linktree, Bandcamp, Instagram
- [Recommended Simplifications](../../docs/artist-pages-evaluation.md#-recommended-simplifications) - 3 options

## Questions?

If tests fail unexpectedly or you need clarification on what a test is validating, refer to:
1. The test's inline comments (each test has detailed "What It Tests" documentation)
2. The [artist-pages-evaluation.md](../../docs/artist-pages-evaluation.md) document
3. Console logs from the `Complexity Metrics` tests for quantitative data
