import { expect, test } from "@playwright/test";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@socialhub.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function openCreatorSettings(page: import("@playwright/test").Page) {
  await page.goto("/settings?tab=creator");
  await expect(page.getByText("Build the creator page directly.")).toBeVisible();
}

test.describe("Artist page current workflows", () => {
  test("creator settings exposes the visual builder shell", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorSettings(page);

    await expect(page.getByText("Page identity tools")).toBeVisible();
    await expect(page.getByText("Page creation tools").last()).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Page/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /View Public Page/i })).toBeVisible();
  });

  test("creator settings keeps page name when switching tabs", async ({ page }) => {
    const artistName = `Builder Test ${Date.now()}`;

    await loginAsAdmin(page);
    await openCreatorSettings(page);

    const pageNameInput = page.locator('label:has-text("Page name")').locator("..").locator("input").first();
    await pageNameInput.fill(artistName);

    await page.getByRole("tab", { name: "Photos" }).click();
    await expect(page.getByText("Personal Photo Gallery").first()).toBeVisible();

    await page.getByRole("tab", { name: /Creator Page/i }).click();
    await expect(pageNameInput).toHaveValue(artistName);
  });

  test("creator settings offers a public-page action", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorSettings(page);

    await Promise.all([
      page.waitForURL(/\/artists\/\d+$/),
      page.getByRole("button", { name: /View Public Page/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/artists\/\d+$/);
    await expect(page.getByRole("button", { name: /Gallery/i }).first()).toBeVisible();
  });

  test("artist identity carries into the feed composer with explicit publishing guidance", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/artists/1");
    await expect(page.getByRole("button", { name: /Edit Artist Page/i })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: /^Create$/ }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Artist Page" })).toBeVisible();
    await expect(page.getByText(/Artist-page posts still appear in the main feed/i)).toBeVisible();
  });

  test("feed renders hashtag chips and trending topics after a tagged post", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");

    await page.getByTestId("open-post-composer").click();
    await page.getByPlaceholder("Share a release, drop, collab, or update...").fill(`Signal boost ${Date.now()} #warehousepulse #afterhoursgrid`);
    await page.getByTestId("submit-post").click();

    await expect(page.getByRole("heading", { name: "Trending Topics" })).toBeVisible();
    await expect(page.locator('a[href="/topics/warehousepulse"]').first()).toBeVisible();
    await expect(page.locator('a[href="/topics/afterhoursgrid"]').first()).toBeVisible();
  });

  test("discover exposes current creator browse filters", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/discover");

    await expect(page.getByText("Find creators with enough context to decide fast.")).toBeVisible();
    await expect(page.getByPlaceholder("Refine creators by tags")).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.getByPlaceholder("City / state")).toBeVisible();
  });

  test("dedicated topic page opens with focused creator context", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/topics/techno?view=artists");

    await expect(page.getByText("Topic Hub", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "#techno" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Creator Pages" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open Full Search" })).toBeVisible();
  });

  test("discover promotes artist page creation to non-artists", async ({ page }) => {
    const timestamp = Date.now();
    const username = `viewer${timestamp}`;

    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.com`);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page.getByRole("textbox").nth(0).fill("NYC");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Enter/i }).click();

    await page.goto("/discover");

    await expect(page.getByText(/Turn your profile into a real artist page/i)).toBeVisible();
    await page.getByRole("button", { name: /Create Artist Page/i }).click();

    await expect(page).toHaveURL(/\/settings\?tab=creator$/);
    await expect(page.getByText("Quick Launch")).toBeVisible();
    await expect(page.getByText("Starter Checklist")).toBeVisible();
  });

  test("artist page loads on mobile with stats and tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/artists/1");

    await expect(page.getByText("Home").last()).toBeVisible();
    await expect(page.getByText("Create").last()).toBeVisible();
    await expect(page.getByText("Messages").last()).toBeVisible();
    await expect(page.getByText("Posts").first()).toBeVisible();
    await expect(page.getByText("Gallery").first()).toBeVisible();
    await expect(page.getByText("About").first()).toBeVisible();
    await expect(page.getByText("Followers", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Following", { exact: true }).last()).toBeVisible();
  });

  test("artist mobile gallery tab shows gallery content instead of scrolling the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/artists/1");
    await page.getByRole("tablist", { name: "Artist page sections" }).getByRole("tab", { name: "Gallery" }).click();

    await expect(page.getByRole("tab", { name: "Gallery", selected: true })).toBeVisible();
    await expect(page.getByText("Creator Gallery")).toBeVisible();
    await expect(page.getByText(/All creator images in one full gallery/i)).toBeVisible();
  });
});
