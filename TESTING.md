# Testing Guide for Social Hub

## Quick Start

```bash
# Run all E2E tests
pnpm test:e2e

# Run only artist page tests
pnpm test:e2e artist-pages

# Run with interactive UI
pnpm dlx playwright test --ui

# Run specific test
pnpm test:e2e -g "user encounters overwhelming settings form"
```

## Test Suites

### 1. Authentication & Onboarding
**File**: [tests/e2e/auth-onboarding.spec.ts](tests/e2e/auth-onboarding.spec.ts)

Tests new user registration and onboarding flow.

### 2. Posting & Comments
**File**: [tests/e2e/posting.spec.ts](tests/e2e/posting.spec.ts)

Tests post creation and commenting functionality.

### 3. Artist Pages (NEW)
**File**: [tests/e2e/artist-pages.spec.ts](tests/e2e/artist-pages.spec.ts)

Comprehensive tests for artist page creation, discovery, and workflows.

**📊 17 test cases** across 8 categories:
- Artist page creation flow
- Dual identity confusion
- Artist discovery workflow
- Booking inquiry flow
- Gallery management
- Settings persistence
- Mobile experience
- Complexity metrics

**Documentation**: See [tests/e2e/README-ARTIST-PAGES.md](tests/e2e/README-ARTIST-PAGES.md)

## Prerequisites

Before running tests, ensure:

1. **Database is running**:
   ```bash
   # Start local PostgreSQL
   .\scripts\start-local-postgres.ps1
   ```

2. **Database is migrated and seeded**:
   ```bash
   pnpm db:migrate
   pnpm --filter @workspace/db run seed
   ```

3. **API server is running** (or let tests start it):
   ```bash
   # Option A: Let tests start API automatically
   pnpm test:e2e

   # Option B: Start API manually and skip auto-boot
   .\scripts\start-local-api.ps1
   set PLAYWRIGHT_SKIP_API_BOOT=1
   pnpm test:e2e
   ```

4. **Frontend is running** (or let tests start it):
   ```bash
   # Let Playwright start frontend automatically
   pnpm test:e2e

   # Or start manually
   pnpm --filter @workspace/social-app run dev
   ```

## Test Configuration

**File**: [playwright.config.ts](playwright.config.ts)

- **Frontend URL**: `http://localhost:5173`
- **API URL**: `http://localhost:3001`
- **Test Timeout**: 60 seconds
- **Workers**: 1 (sequential execution)
- **Video**: Recorded on failure
- **Screenshots**: Captured on failure

## Understanding Test Results

### ✅ Passing Tests
Tests pass = feature works as expected.

### ❌ Failing Tests
Check test name to understand what failed:
- **Bug tests**: `user loses work when switching tabs` → Known Bug #1
- **Feature tests**: `visitor can submit booking inquiry` → Core feature broken

### 📊 Metric Tests
These tests **always pass** but log important data:
- `count total settings inputs` → Outputs field count per tab
- `measure time-to-first-artist-page` → Outputs setup time in seconds

**Look for console output**:
```
Total input fields across settings: 42
- Profile tab: 15
- Creator tab: 24
- Photos tab: 3

Time to create basic artist page: 12.4s
```

## Interpreting Artist Page Test Results

### Expected Pass ✅
- `visitor can discover and view artist page`
- `visitor sees call-to-action on discover page`
- `visitor can submit booking inquiry`
- `artist settings persist across page reloads`
- Mobile tests

### May Fail ⚠️ (Known Issues)
- `user loses work when switching tabs` - State loss bug
- `artist can add gallery item but gets no upload feedback` - Missing spinner
- `action button routing logic handles external URLs` - Routing bug

### Always Pass 📊 (Document Problems)
- `new user encounters overwhelming settings form` - Shows 20+ fields
- `user cannot find preview button` - Proves missing feature
- Dual identity tests - Expose confusion
- Complexity metrics - Quantify problems

## Debugging Failed Tests

### View Test Report
```bash
# After test run, open HTML report
pnpm dlx playwright show-report
```

### Run Single Test in Debug Mode
```bash
# Run with headed browser
pnpm dlx playwright test --headed -g "specific test name"

# Run with Playwright Inspector
pnpm dlx playwright test --debug -g "specific test name"
```

### Check Test Artifacts
Failed tests automatically save:
- **Screenshots**: `test-results/.../test-failed-1.png`
- **Videos**: `test-results/.../video.webm`
- **Traces**: `test-results/.../trace.zip` (open with `pnpm dlx playwright show-trace`)

## Common Issues

### "API server not responding"
**Solution**: Start API manually before tests:
```bash
.\scripts\start-local-api.ps1
set PLAYWRIGHT_SKIP_API_BOOT=1
pnpm test:e2e
```

### "Cannot find admin@socialhub.local user"
**Solution**: Re-seed database:
```bash
pnpm --filter @workspace/db run seed
```

### "Timeout waiting for element"
**Causes**:
- Frontend not running
- API not responding
- Database not seeded
- Element selector changed

**Solution**: Run tests with `--headed` to see what's happening:
```bash
pnpm dlx playwright test --headed
```

### Test passes locally but fails in CI
**Causes**:
- Timing differences
- Missing database seed
- Port conflicts

**Solution**: Add wait statements or use `page.waitForLoadState()`:
```typescript
await page.goto("/discover");
await page.waitForLoadState("networkidle");
```

## Test Data

Tests use these credentials:

**Admin User** (pre-seeded):
- Email: `admin@socialhub.local`
- Password: `admin123`
- User ID: `1`

**Generated Users** (created during tests):
- Username: `playwright{timestamp}`
- Email: `playwright{timestamp}@example.com`
- Password: `password123`

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: social_hub
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: socialhub
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm --filter @workspace/db run seed
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Writing New Tests

### Test Template
```typescript
import { expect, test } from "@playwright/test";

test("descriptive test name", async ({ page }) => {
  // 1. Setup: Login or navigate
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@socialhub.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();

  // 2. Navigate to feature
  await page.goto("/some-feature");

  // 3. Interact with UI
  await page.getByRole("button", { name: "Do Something" }).click();

  // 4. Assert expected outcome
  await expect(page.getByText("Success")).toBeVisible();
});
```

### Best Practices
1. **Use semantic selectors**: `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Add data-testid for critical elements**: `data-testid="submit-post"`
3. **Wait for network idle on navigation**: `await page.waitForLoadState("networkidle")`
4. **Use unique test data**: `const unique = Date.now()` to avoid collisions
5. **Clean up after tests**: Delete created data or use transactions

## Performance Testing

### Measure Page Load Times
```typescript
test("home page loads quickly", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const loadTime = Date.now() - start;

  console.log(`Home page loaded in ${loadTime}ms`);
  expect(loadTime).toBeLessThan(3000); // Should load in <3s
});
```

### Measure User Flow Duration
See `measure time-to-first-artist-page` test in [artist-pages.spec.ts](tests/e2e/artist-pages.spec.ts) for example.

## Related Documentation

- **Artist Pages Test Documentation**: [tests/e2e/README-ARTIST-PAGES.md](tests/e2e/README-ARTIST-PAGES.md)
- **Artist Pages Evaluation**: [docs/artist-pages-evaluation.md](docs/artist-pages-evaluation.md)
- **Artist Pages Testing Summary**: [docs/artist-pages-testing-summary.md](docs/artist-pages-testing-summary.md)
- **Playwright Documentation**: https://playwright.dev/

## Questions?

If you encounter issues not covered here:
1. Check test-specific README files
2. Review test inline comments (all tests are documented)
3. Run tests with `--headed` to see browser behavior
4. Check `playwright-report/` for detailed failure analysis
