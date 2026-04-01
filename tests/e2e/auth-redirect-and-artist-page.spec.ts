import { expect, test } from "@playwright/test";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@socialhub.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();
}

test.describe("Auth redirect and artist page stability", () => {
  test("login always redirects to home", async ({ page }) => {
    await page.goto("/artists/1");
    await expect(page).toHaveURL(/\/login$/);

    await loginAsAdmin(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("open-post-composer")).toBeVisible();
  });

  test("artist page loads without crashing after login", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/artists/1");

    await expect(page).toHaveURL(/\/artists\/1$/);
    await expect(page.getByText("About").first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
