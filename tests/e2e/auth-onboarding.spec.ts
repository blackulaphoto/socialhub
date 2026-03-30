import { expect, test } from "@playwright/test";

test("new user can register and complete onboarding", async ({ page }) => {
  const token = Date.now();
  await page.goto("/register");

  await page.getByLabel("Username").fill(`playwright${token}`);
  await page.getByLabel("Email").fill(`playwright${token}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  const profileTextboxes = page.getByRole("textbox");
  await profileTextboxes.nth(0).fill("Los Angeles");
  await profileTextboxes.nth(1).fill("Los Angeles, CA");
  await page.getByPlaceholder("A quick one-line intro.").fill("Testing the first-run flow.");
  await page.getByPlaceholder("What do you do, what are you into, what kind of people should find you here?").fill("Photographer and nightlife regular.");
  await page.getByPlaceholder("techno, galleries, film, fashion, nightlife").fill("techno, galleries, portraiture");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("You are ready")).toBeVisible();
  await page.getByRole("button", { name: "Enter ArtistHub" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("open-post-composer")).toBeVisible();
});
