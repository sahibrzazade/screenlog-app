import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;
const BREAKING_BAD_TMDB_ID = 1396;

test("logs a movie and a season, then confirms both show up in their correct /diary sections", async ({
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
    await season1.getByText("Date finished & review").click();
    await season1.getByLabel("Rate 4 out of 5 stars", { exact: true }).check({ force: true });
    await season1.getByLabel("Date finished").fill("2020-02-01");
    await season1.getByLabel("Review (optional)").fill("Great start.");
    await season1.getByRole("button", { name: "Rate season" }).click();
    await expect(season1.getByRole("button", { name: "Update rating" })).toBeVisible();

    await page.goto("/diary");
    const moviesSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Movies" }) });
    const showsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Shows" }) });

    const movieEntry = moviesSection.getByRole("listitem");
    const seasonEntry = showsSection.getByRole("listitem");

    await expect(movieEntry).toHaveCount(1);
    await expect(seasonEntry).toHaveCount(1);

    await expect(movieEntry).toContainText("The Matrix");
    await expect(movieEntry).toContainText("1 Jan 2020");
    await expect(movieEntry).toContainText("Great movie.");

    await expect(seasonEntry).toContainText("Breaking Bad");
    await expect(seasonEntry).toContainText("1 Feb 2020");
    await expect(seasonEntry).toContainText("Great start.");
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test("logs a season and an overall show rating, then confirms the Shows section sorts them by date", async ({
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

    await page.goto(`/tv/${BREAKING_BAD_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "Breaking Bad" })).toBeVisible();

    const season1 = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: "Season 1" }) });
    await season1.getByText("Date finished & review").click();
    await season1.getByLabel("Rate 4 out of 5 stars", { exact: true }).check({ force: true });
    await season1.getByLabel("Date finished").fill("2020-02-01");
    await season1.getByRole("button", { name: "Rate season" }).click();
    await expect(season1.getByRole("button", { name: "Update rating" })).toBeVisible();

    const yourRatingSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Your rating" }) });
    await yourRatingSection
      .getByLabel("Rate 5 out of 5 stars", { exact: true })
      .check({ force: true });
    await yourRatingSection.getByLabel("Date finished").fill("2020-03-01");
    await yourRatingSection.getByRole("button", { name: "Rate this show" }).click();
    await expect(yourRatingSection.getByRole("button", { name: "Update rating" })).toBeVisible();

    await page.goto("/diary");
    const showsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Shows" }) });
    const showEntries = showsSection.getByRole("listitem");

    await expect(showEntries).toHaveCount(2);
    // Overall show rating (2020-03-01) is newer than the season (2020-02-01).
    await expect(showEntries.nth(0)).toContainText("1 Mar 2020");
    await expect(showEntries.nth(1)).toContainText("Breaking Bad — Season 1");
    await expect(showEntries.nth(1)).toContainText("1 Feb 2020");
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
