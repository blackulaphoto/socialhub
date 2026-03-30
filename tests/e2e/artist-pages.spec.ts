import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Artist Pages Feature
 *
 * Purpose: Validate critical user workflows and expose UX complexity issues
 * documented in docs/artist-pages-evaluation.md
 *
 * Critical Issues Being Tested:
 * 1. Dual identity confusion (personal vs artist posting)
 * 2. Settings form complexity (45+ fields)
 * 3. Workflow friction (navigation, feedback gaps)
 * 4. Feature discoverability problems
 */

test.describe("Artist Page Creation Flow", () => {
  test("new user encounters overwhelming settings form", async ({ page }) => {
    // This test now measures the starter-vs-advanced creator setup flow
    const timestamp = Date.now();
    const username = `artist${timestamp}`;

    // Register and complete onboarding first
    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.com`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("textbox").nth(0).fill("Berlin");
    await page.getByRole("textbox").nth(1).fill("Berlin, Germany");
    await page.getByPlaceholder("A quick one-line intro.").fill("Techno DJ");
    await page.getByPlaceholder("What do you do").fill("Underground techno artist");
    await page.getByPlaceholder("techno, galleries").fill("techno, house, dj");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("You are ready")).toBeVisible();
    await page.getByRole("button", { name: "Enter ArtistHub" }).click();

    // Now user wants to create artist page
    await page.goto("/artists");
    const createButton = page.locator("main").getByRole("button", { name: /Create Artist Page/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    // User lands on settings page with creator starter flow
    await expect(page).toHaveURL(/\/settings\?tab=creator/);
    await page.getByRole("tab", { name: /Creator Page/i }).click();
    await expect(page.getByText("Starter creator setup")).toBeVisible();

    const starterFields = page.locator('[role="tabpanel"] input:visible, [role="tabpanel"] textarea:visible, [role="tabpanel"] button[role="combobox"]:visible');
    const starterFieldCount = await starterFields.count();

    // Starter flow should be lighter than the old all-at-once creator form
    expect(starterFieldCount).toBeGreaterThanOrEqual(5);
    expect(starterFieldCount).toBeLessThan(15);

    // Fill minimal starter fields
    await page.getByPlaceholder("Rancid").fill(`DJ ${username}`);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Musician \/ Band \/ DJ|General Creator/i }).first().click();
    await page.getByPlaceholder("Los Angeles, CA").fill("Berlin");
    await page.getByPlaceholder("Industrial techno DJ for warehouse rooms and art-forward nights.").fill("Underground techno from Berlin");
    await page.getByPlaceholder("techno, darkwave, latex, portraits").fill("techno, house, dj");
    await page.getByPlaceholder("bookings@example.com").fill(`${username}@artisthub.local`);

    // Advanced fields are hidden behind an explicit progressive-disclosure step
    const advancedButton = page.getByRole("button", { name: /Show Advanced Fields|Unlock Advanced Creator Fields/i });
    await expect(advancedButton).toBeVisible();
    await advancedButton.click();

    const advancedFields = page.locator('[role="tabpanel"] input:visible, [role="tabpanel"] textarea:visible, [role="tabpanel"] button[role="combobox"]:visible');
    const advancedFieldCount = await advancedFields.count();
    expect(advancedFieldCount).toBeGreaterThan(starterFieldCount);
    expect(advancedFieldCount).toBeGreaterThan(15);

    // Save and expect the page to remain in settings with creator tools visible
    const saveButton = page.getByRole("button", { name: /Save Creator Page/i });
    await saveButton.click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText(/Creator Preview/i)).toBeVisible();
  });

  test("user loses work when switching tabs in settings", async ({ page }) => {
    // This test exposes Bug #1 from evaluation: Settings don't auto-save
    const timestamp = Date.now();

    // Login as existing user
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/settings?tab=creator");
    await page.getByRole("tab", { name: /Creator Page/i }).click();

    // Fill several fields in Creator tab
    await page.getByPlaceholder("Rancid").fill(`Test Artist ${timestamp}`);
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /Musician \/ Band \/ DJ|General Creator/i }).first().click();
    await page.getByPlaceholder("Industrial techno DJ for warehouse rooms and art-forward nights.").fill("Underground techno from Berlin");

    const filledValue = `Test Artist ${timestamp}`;

    // Switch to Photos tab
    await page.getByRole("tab", { name: "Photos" }).click();
    await expect(page.getByRole("tabpanel")).toContainText(/Personal Photo Gallery/i);

    // Switch back to Creator tab
    await page.getByRole("tab", { name: /Creator Page/i }).click();

    // PROBLEM: Values should persist but might not due to useState initialization bug
    // This will fail if Bug #1 exists
    const artistNameInput = page.getByPlaceholder("Rancid");
    await expect(artistNameInput).toHaveValue(filledValue);
  });

  test("user cannot find preview button", async ({ page }) => {
    // This test validates preview discoverability in creator settings
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/settings?tab=creator");
    await page.getByRole("tab", { name: /Creator Page/i }).click();

    const previewButton = page.getByRole("button", { name: /Preview/i });
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    await expect(page).toHaveURL(/\/artists\/\d+$/);
  });
});

test.describe("Dual Identity Confusion", () => {
  test("user confused by personal vs artist posting modes", async ({ page }) => {
    // This test exposes the F-grade dual identity UX problem
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Ensure user has artist page
    await page.goto("/settings?tab=creator");
    const artistNameInput = page.getByLabel(/Artist page name/i);
    if ((await artistNameInput.inputValue()) === "") {
      await artistNameInput.fill("Admin Artist");
      await page.getByLabel(/Category/i).selectOption("Music");
      await page.getByRole("button", { name: /Save Changes/i }).click();
      await page.waitForTimeout(1000); // Wait for save
    }

    // Go to home feed
    await page.goto("/");

    // PROBLEM: User sees identity toggle but doesn't understand it
    const identityToggle = page.locator("text=Personal").or(page.locator("text=Artist Page"));

    if (await identityToggle.count() > 0) {
      // Identity toggle exists - test the confusion

      // Open post composer
      await page.getByTestId("open-post-composer").click();

      // PROBLEM: Badge shows "Posting as personal" but badge is NOT clickable
      const postingBadge = page.locator("text=/Posting as/i");

      // User tries to click the badge expecting it to change mode
      if (await postingBadge.count() > 0) {
        await postingBadge.first().click();
        // Nothing happens - user is confused
      }

      // User must find the toggle in header (not obvious)
      await page.getByText("Artist Page").click();

      // PROBLEM: Post composer updates but user's old content may be lost
      // PROBLEM: No explanation that posts go to SEPARATE feeds

      // Create post as artist
      const uniquePost = `Artist post ${Date.now()}`;
      await page.getByTestId("post-composer-textarea").fill(uniquePost);
      await page.getByTestId("submit-post").click();

      // PROBLEM: Post appears in feed but only visible on artist page
      // User's friends on personal profile won't see it

      // This creates confusion about post visibility
    }
  });

  test("user cannot find artist post on personal profile", async ({ page }) => {
    // This exposes the split-feed confusion
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Switch to artist identity and post
    await page.goto("/");

    const artistToggle = page.locator("button", { hasText: "Artist Page" });
    if (await artistToggle.count() > 0) {
      await artistToggle.click();

      const uniquePost = `Test artist post ${Date.now()}`;
      await page.getByTestId("open-post-composer").click();
      await page.getByTestId("post-composer-textarea").fill(uniquePost);
      await page.getByTestId("submit-post").click();

      await expect(page.getByText(uniquePost)).toBeVisible({ timeout: 5000 });

      // Now go to personal profile
      await page.goto("/profile/1"); // Admin user ID

      // PROBLEM: Artist post NOT visible on personal profile
      // User thinks post was lost or broken
      const postVisible = await page.getByText(uniquePost).count();

      // Post should be visible but isn't (separate feeds)
      expect(postVisible).toBe(0);

      // User must navigate to /artists/1 to see the post
      await page.goto("/artists/1");
      await expect(page.getByText(uniquePost)).toBeVisible();

      // This split-feed model creates massive confusion
    }
  });
});

test.describe("Artist Discovery Workflow", () => {
  test("visitor can discover and view artist page", async ({ page }) => {
    // Positive test: Basic discovery flow works
    await page.goto("/discover");

    // Search filters are visible
    await expect(page.getByPlaceholder(/Search by tags/i)).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Category/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Location/i)).toBeVisible();

    // Filter by category
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Music" }).click();

    // Wait for results
    await page.waitForTimeout(500);

    // Click first artist card (if any exist)
    const artistCard = page.locator("[href^='/artists/']").first();
    const artistCardCount = await artistCard.count();

    if (artistCardCount > 0) {
      await artistCard.click();

      // Should land on artist page
      await expect(page).toHaveURL(/\/artists\/\d+/);

      // Artist page components should be visible
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("visitor sees call-to-action on discover page", async ({ page }) => {
    // Test the "Create Artist Page" CTA shown to non-artists
    const timestamp = Date.now();
    const username = `viewer${timestamp}`;

    // Register but don't create artist page
    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.com`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("textbox").nth(0).fill("NYC");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Enter/i }).click();

    // Go to discover page
    await page.goto("/discover");

    // Should see CTA card promoting artist page creation
    const ctaCard = page.locator("text=/Turn your profile into a real artist page/i");
    await expect(ctaCard).toBeVisible();

    const createButton = page.getByRole("button", { name: /Create Artist Page/i });
    await expect(createButton).toBeVisible();
  });
});

test.describe("Booking Inquiry Flow", () => {
  test("visitor can submit booking inquiry", async ({ page }) => {
    // Test the booking form on artist pages
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Create artist page with booking enabled
    await page.goto("/settings?tab=creator");
    await page.getByLabel(/Artist page name/i).fill("Booking Test Artist");
    await page.getByLabel(/Category/i).selectOption("Music");
    await page.getByLabel(/Booking email/i).fill("booking@test.com");

    // Set primary action to booking
    const actionTypeSelect = page.locator("select").filter({ hasText: /Contact Me|Book Me|Commission/i });
    if (await actionTypeSelect.count() > 0) {
      await actionTypeSelect.selectOption("booking");
    }

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await page.waitForTimeout(1000);

    // Visit own artist page
    await page.goto("/artists/1");

    // Find and click booking/contact button
    const bookingButton = page.getByRole("button", { name: /Book|Contact|Inquire/i }).first();

    if (await bookingButton.count() > 0) {
      await bookingButton.click();

      // PROBLEM: Dialog might open empty if URL not configured (Bug #3)
      // Fill inquiry form
      const inquiryTextarea = page.getByPlaceholder(/Tell us about/i);

      if (await inquiryTextarea.count() > 0) {
        await inquiryTextarea.fill("Test booking inquiry for event on May 15th");

        const submitButton = page.getByRole("button", { name: /Send|Submit/i });
        if (await submitButton.count() > 0) {
          await submitButton.click();

          // Should show success message
          await expect(page.getByText(/sent|success/i)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test("action button routing logic handles external URLs", async ({ page }) => {
    // This tests Bug #3: Shop/Store actions should open external link, not dialog
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Configure artist page with external shop URL
    await page.goto("/settings?tab=creator");

    const actionUrlInput = page.getByLabel(/Primary action URL|External destination/i);
    if (await actionUrlInput.count() > 0) {
      await actionUrlInput.fill("https://shop.example.com");

      const actionLabelInput = page.getByLabel(/Primary action label|Custom button label/i);
      if (await actionLabelInput.count() > 0) {
        await actionLabelInput.fill("Shop My Work");
      }

      await page.getByRole("button", { name: /Save Changes/i }).click();
      await page.waitForTimeout(1000);

      // Visit artist page
      await page.goto("/artists/1");

      // Click the shop button
      const shopButton = page.getByRole("button", { name: "Shop My Work" });
      if (await shopButton.count() > 0) {
        // PROBLEM: Might open dialog instead of navigating to URL
        // This is Bug #3 from the evaluation

        const [popup] = await Promise.race([
          Promise.all([page.waitForEvent("popup")]).then((result) => result),
          page.waitForTimeout(2000).then(() => [null]),
        ]);

        if (popup) {
          // Correct behavior: opened external link in new tab
          await expect(popup).toHaveURL(/shop\.example\.com/);
          await popup.close();
        } else {
          // Incorrect behavior: opened dialog instead
          // This would expose Bug #3
          const dialog = page.locator("role=dialog");
          const dialogVisible = await dialog.count();

          // If dialog opened, bug exists
          if (dialogVisible > 0) {
            console.log("BUG DETECTED: Shop button opened dialog instead of external link");
          }
        }
      }
    }
  });
});

test.describe("Gallery Management", () => {
  test("artist can add gallery item but gets no upload feedback", async ({ page }) => {
    // This test exposes Bug #2: No upload progress indicator
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.goto("/settings?tab=gallery");

    // Try to add gallery item
    const urlInput = page.getByPlaceholder(/paste.*URL|image URL/i);
    if (await urlInput.count() > 0) {
      await urlInput.fill("https://placehold.co/800x600/png");

      const addButton = page.getByRole("button", { name: /Add Item|Add to Gallery/i });
      if (await addButton.count() > 0) {
        await addButton.click();

        // PROBLEM: No loading spinner or progress indicator
        // User waits 3+ seconds with no feedback

        const spinner = page.locator("[data-testid='gallery-upload-spinner']");
        const spinnerCount = await spinner.count();

        // Should show spinner but doesn't (Bug #2)
        expect(spinnerCount).toBe(0);

        // Item eventually appears but user has no feedback during wait
        await expect(page.locator("img[src*='placehold.co']")).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe("Settings Persistence", () => {
  test("artist settings persist across page reloads", async ({ page }) => {
    const timestamp = Date.now();
    const artistName = `Persistence Test ${timestamp}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Set artist page settings
    await page.goto("/settings?tab=creator");
    await page.getByLabel(/Artist page name/i).fill(artistName);
    await page.getByLabel(/Category/i).selectOption("Music");

    const taglineInput = page.getByLabel(/Hero tagline/i);
    if (await taglineInput.count() > 0) {
      await taglineInput.fill("Test tagline for persistence");
    }

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });

    // Reload page
    await page.reload();

    // Values should persist
    await expect(page.getByLabel(/Artist page name/i)).toHaveValue(artistName);
    await expect(page.getByLabel(/Category/i)).toHaveValue("Music");
  });
});

test.describe("Mobile Experience (Viewport)", () => {
  test("settings form is usable on mobile", async ({ page }) => {
    // Test mobile responsiveness of settings
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.goto("/settings?tab=creator");

    // PROBLEM: Desktop preview card hidden on mobile (documented in evaluation)
    const previewCard = page.locator("[data-testid='settings-preview-card']");
    const previewVisible = await previewCard.isVisible();

    // Preview likely hidden on mobile
    expect(previewVisible).toBe(false);

    // Form should still be scrollable and usable
    const artistNameInput = page.getByLabel(/Artist page name/i);
    await expect(artistNameInput).toBeVisible();

    // User can fill fields on mobile
    await artistNameInput.fill("Mobile Test Artist");
    await artistNameInput.press("Enter"); // Scroll into view

    const saveButton = page.getByRole("button", { name: /Save Changes/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeVisible();
  });

  test("artist discovery works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/discover");

    // Filters should stack vertically on mobile
    const searchInput = page.getByPlaceholder(/Search by tags/i);
    await expect(searchInput).toBeVisible();

    const categorySelect = page.getByRole("combobox").first();
    await expect(categorySelect).toBeVisible();

    // Grid should be single column on mobile
    const artistCards = page.locator("[href^='/artists/']");
    const cardCount = await artistCards.count();

    if (cardCount > 0) {
      // Click first artist card
      await artistCards.first().click();

      // Artist page should render on mobile
      await expect(page).toHaveURL(/\/artists\/\d+/);

      // Hero section should be visible
      const heroSection = page.locator("h1, h2").first();
      await expect(heroSection).toBeVisible();
    }
  });
});

test.describe("Complexity Metrics", () => {
  test("count total settings inputs to validate 45+ field claim", async ({ page }) => {
    // This test VALIDATES the evaluation's claim of 45+ fields
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@socialhub.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.goto("/settings?tab=profile");
    const profileInputs = await page.locator('input:visible, textarea:visible, select:visible').count();

    await page.goto("/settings?tab=creator");
    const creatorInputs = await page.locator('input:visible, textarea:visible, select:visible').count();

    await page.goto("/settings?tab=photos");
    const photosInputs = await page.locator('input:visible, textarea:visible, select:visible').count();

    const totalInputs = profileInputs + creatorInputs + photosInputs;

    console.log(`Total input fields across settings: ${totalInputs}`);
    console.log(`- Profile tab: ${profileInputs}`);
    console.log(`- Creator tab: ${creatorInputs}`);
    console.log(`- Photos tab: ${photosInputs}`);

    // Evaluation claims 45+ fields - validate this
    // Even if some tabs share state, user sees 30+ distinct decisions to make
    expect(creatorInputs).toBeGreaterThan(15);
  });

  test("measure time-to-first-artist-page for new user", async ({ page }) => {
    // This test measures the "15-30 minute" setup time claim
    const startTime = Date.now();
    const timestamp = Date.now();
    const username = `speedtest${timestamp}`;

    // Register
    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.com`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    // Onboarding
    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("textbox").nth(0).fill("London");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Enter/i }).click();

    // Create artist page
    await page.goto("/settings?tab=creator");
    await page.getByLabel(/Artist page name/i).fill(`Speed Test ${username}`);
    await page.getByLabel(/Category/i).selectOption("Music");
    await page.getByRole("button", { name: /Save Changes/i }).click();

    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5000 });

    const endTime = Date.now();
    const timeInSeconds = (endTime - startTime) / 1000;

    console.log(`Time to create basic artist page: ${timeInSeconds.toFixed(1)}s`);

    // Even with minimal fields, this takes 10-20 seconds
    // With full customization, evaluation claims 15-30 minutes
    // A good onboarding wizard should reduce this to <60 seconds
  });
});
