import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;
const BREAKING_BAD_TMDB_ID = 1396;

test("logs a movie and a season, then confirms both show up on /diary in the right order", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "The Matrix" })).toBeVisible();
    await page.getByLabel("Rate 3.5 out of 5 stars", { exact: true }).check({ force: true });
    await page.getByLabel("Watched date").fill("2020-01-01");
    await page.getByLabel("Review (optional)").fill("Great movie.");
    await page.getByRole("button", { name: "Log movie" }).click();
    await expect(page.getByText("Log saved")).toBeVisible();

    await page.goto(`/tv/${BREAKING_BAD_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "Breaking Bad" })).toBeVisible();
    const season1 = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: "Season 1" }) });
    await season1.getByText("Watched date & review").click();
    await season1.getByLabel("Rate 4 out of 5 stars", { exact: true }).check({ force: true });
    await season1.getByLabel("Watched date").fill("2020-02-01");
    await season1.getByLabel("Review (optional)").fill("Great start.");
    await season1.getByRole("button", { name: "Rate season" }).click();
    await expect(season1.getByRole("button", { name: "Update rating" })).toBeVisible();

    await page.goto("/diary");
    const entries = page.getByRole("listitem");
    await expect(entries).toHaveCount(2);

    const seasonEntry = entries.filter({ hasText: "Breaking Bad" });
    const movieEntry = entries.filter({ hasText: "The Matrix" });

    // Season entry (watched 2020-02-01) should come before the movie (2020-01-01).
    await expect(entries.nth(0)).toContainText("Breaking Bad");
    await expect(entries.nth(1)).toContainText("The Matrix");

    await expect(seasonEntry).toContainText("2020-02-01");
    await expect(seasonEntry).toContainText("Great start.");
    await expect(movieEntry).toContainText("2020-01-01");
    await expect(movieEntry).toContainText("Great movie.");
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
