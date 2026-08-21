import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BREAKING_BAD_TMDB_ID = 1396;

test("rates two different seasons of the same show and confirms both persist independently", async ({
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
    await season1.getByLabel("Review (optional)").fill("Great start.");
    await season1.getByRole("button", { name: "Rate season" }).click();
    // Wait for this specific season's button to flip to its post-save label
    // rather than the toast text, which is identical across seasons and can
    // still be on screen from a previous save when the next one completes.
    await expect(season1.getByRole("button", { name: "Update rating" })).toBeVisible();

    const season2 = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: "Season 2" }) });
    await season2.getByText("Date finished & review").click();
    await season2.getByLabel("Rate 5 out of 5 stars", { exact: true }).check({ force: true });
    await season2.getByLabel("Date finished").fill("2020-03-01");
    await season2.getByLabel("Review (optional)").fill("Even better.");
    await season2.getByRole("button", { name: "Rate season" }).click();
    await expect(season2.getByRole("button", { name: "Update rating" })).toBeVisible();

    const { data: logs, error: selectError } = await adminClient
      .from("season_logs")
      .select("season_number, rating, review, watched_date")
      .eq("user_id", userId)
      .eq("tmdb_show_id", BREAKING_BAD_TMDB_ID)
      .order("season_number", { ascending: true });

    if (selectError) throw selectError;
    expect(logs).toHaveLength(2);
    expect(logs![0]).toMatchObject({
      season_number: 1,
      rating: 4,
      review: "Great start.",
      watched_date: "2020-02-01",
    });
    expect(logs![1]).toMatchObject({
      season_number: 2,
      rating: 5,
      review: "Even better.",
      watched_date: "2020-03-01",
    });
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
