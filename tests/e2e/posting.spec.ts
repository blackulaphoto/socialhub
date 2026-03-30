import { expect, test } from "@playwright/test";

test("existing user can log in, post, and comment", async ({ page }) => {
  const uniqueText = `Playwright post ${Date.now()}`;
  const commentText = `Playwright comment ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@socialhub.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.getByTestId("open-post-composer").click();
  await page.getByTestId("post-composer-textarea").fill(uniqueText);
  await page.getByTestId("submit-post").click();

  await expect(page.getByText(uniqueText)).toBeVisible();

  const postCard = page.locator("[data-testid^='post-card-']").filter({ hasText: uniqueText }).first();
  const postTestId = await postCard.getAttribute("data-testid");
  const postId = postTestId?.replace("post-card-", "");
  if (!postId) {
    throw new Error("Could not resolve created post id");
  }

  await postCard.locator(`[data-testid="toggle-comments-${postId}"]`).last().click();
  await page.getByTestId(`comment-input-${postId}`).fill(commentText);
  await page.getByTestId(`submit-comment-${postId}`).click();

  await expect(page.getByText(commentText)).toBeVisible();
});
