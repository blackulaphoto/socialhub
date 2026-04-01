import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXWQAAAAASUVORK5CYII=";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@socialhub.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/$/);
  await page.waitForLoadState("networkidle");
}

async function openCreatorBuilder(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.goto("/settings?tab=creator", { waitUntil: "networkidle" });
  await page.waitForURL(/\/settings\?tab=creator/);
  await expect(page.getByText("Build the creator page directly.")).toBeVisible();
}

async function createTempPng(page: Page) {
  const dirPath = `${process.cwd()}/test-results/tmp`;
  const filePath = `${dirPath}/picker-test-image-${Date.now()}.png`;
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, Buffer.from(TINY_PNG_BASE64, "base64"));
  return filePath;
}

test.describe("Creator media picker flow", () => {
  test("hero media opens Showcase in picker mode", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Choose Hero Media/i }).click();

    await expect(page).toHaveURL(/\/settings\?tab=gallery&returnTo=creator&picker=hero/);
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Select All/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear All/i })).toBeVisible();
  });

  test("media gallery opens Showcase in gallery picker mode", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Media gallery/i }).first().click();
    await page.getByRole("button", { name: /Select Gallery Images/i }).click();

    await expect(page).toHaveURL(/\/settings\?tab=gallery&returnTo=creator&picker=gallery/);
    await expect(page.getByText(/Selecting Images for Media Gallery/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Select All/i })).toBeVisible();
  });

  test("video playlist opens Showcase in video picker mode", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Video playlist/i }).first().click();
    await page.getByRole("button", { name: /Select Playlist Videos/i }).click();

    await expect(page).toHaveURL(/\/settings\?tab=gallery&returnTo=creator&picker=video/);
    await expect(page.getByText(/Selecting Videos for Video Playlist/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Select All/i })).toBeVisible();
  });

  test("uploading an image in hero picker auto-selects it", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Choose Hero Media/i }).click();
    await page.waitForURL(/\/settings\?tab=gallery&returnTo=creator&picker=hero/);

    const filePath = await createTempPng(page);
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.getByRole("button", { name: /Upload Images/i }).click();

    await expect(page.getByText(/1 item selected/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeEnabled();
  });

  test("uploading an image in media gallery picker auto-selects it", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Media gallery/i }).first().click();
    await page.getByRole("button", { name: /Select Gallery Images/i }).click();
    await page.waitForURL(/\/settings\?tab=gallery&returnTo=creator&picker=gallery/);

    const filePath = await createTempPng(page);
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.getByRole("button", { name: /Upload Images/i }).click();

    await expect(page.getByText(/1 item selected/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeEnabled();
  });

  test("adding a video in playlist picker auto-selects it", async ({ page }) => {
    await loginAsAdmin(page);
    await openCreatorBuilder(page);

    await page.getByRole("button", { name: /Video playlist/i }).first().click();
    await page.getByRole("button", { name: /Select Playlist Videos/i }).click();
    await page.waitForURL(/\/settings\?tab=gallery&returnTo=creator&picker=video/);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Video" }).click();
    await page.getByPlaceholder("Media URL").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: /Add Item/i }).click();

    await expect(page.getByText(/1 item selected/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Apply & Return to Editor/i })).toBeEnabled();
  });
});
