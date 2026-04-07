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

  test("discover exposes current creator browse filters", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/discover");

    await expect(page.getByPlaceholder("Refine creators by tags")).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.getByPlaceholder("City / state")).toBeVisible();
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
    await expect(page.getByRole("button", { name: /Create Artist Page/i })).toBeVisible();
  });

  test("artist page loads on mobile with stats and tabs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/artists/1");

    await expect(page.getByText("Posts").first()).toBeVisible();
    await expect(page.getByText("Gallery").first()).toBeVisible();
    await expect(page.getByText("About").first()).toBeVisible();
    await expect(page.getByText("Followers", { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Following", { exact: true }).last()).toBeVisible();
  });

  test("artist mobile gallery tab shows gallery content instead of scrolling the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page);
    await page.goto("/artists/1?view=gallery");

    await expect(page.getByText("Gallery").first()).toBeVisible();
    await expect(page.getByText("Creator Gallery")).toBeVisible();
    await expect(page.getByText(/All creator images in one full gallery/i)).toBeVisible();
  });
});
