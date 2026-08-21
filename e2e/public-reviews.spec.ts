import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;

test("a logged-in user's review is publicly visible to a guest, and labeled You for the author", async ({
  page,
  browser,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  const username = `e2e-user-${Date.now()}`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user.id;

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ username })
    .eq("id", userId);
  if (profileError) throw profileError;

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await page.getByLabel("Rate 4 out of 5 stars", { exact: true }).check({ force: true });
    await page.getByLabel("Watched date").fill("2020-01-01");
    await page.getByLabel("Review (optional)").fill("Public review text.");
    await page.getByRole("button", { name: "Log movie" }).click();
    await expect(page.getByText("Log saved")).toBeVisible();

    const reviewsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reviews" }) });
    await expect(reviewsSection.getByText("You", { exact: true })).toBeVisible();
    await expect(reviewsSection.getByText("Public review text.")).toBeVisible();

    const guestContext = await browser.newContext();
    try {
      const guestPage = await guestContext.newPage();
      await guestPage.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
      await expect(guestPage.getByRole("heading", { name: "The Matrix" })).toBeVisible();
      const guestReviewsSection = guestPage
        .locator("section")
        .filter({ has: guestPage.getByRole("heading", { name: "Reviews" }) });
      await expect(guestReviewsSection.getByText(username)).toBeVisible();
      await expect(guestReviewsSection.getByText("Public review text.")).toBeVisible();
      await expect(guestReviewsSection.getByText("You", { exact: true })).not.toBeVisible();
    } finally {
      await guestContext.close();
    }

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete log" }).click();
    await expect(page.getByText("Log deleted")).toBeVisible();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
