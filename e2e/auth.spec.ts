import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, logInAndWait } from "./helpers";

test("logs in, logs out, and logs back in", async ({ page }) => {
  const user = await createTestUser();

  try {
    await logInAndWait(page, user.email);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

    await logInAndWait(page, user.email);
  } finally {
    await deleteTestUser(user);
  }
});

test("visiting a protected route while logged out redirects to /login", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page).toHaveURL(/\/login$/);
});
