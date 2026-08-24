import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;
const FIGHT_CLUB_TMDB_ID = 550;
const WATCHLIST_MOVIE_IDS = [603, 155, 27205, 550, 13];

test("shows logged data per section and an empty state for sections with nothing yet", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `e2e_user_${Date.now()}` },
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    const { error: watchlistError } = await adminClient
      .from("watchlist")
      .insert({ user_id: userId, tmdb_id: THE_MATRIX_TMDB_ID, media_type: "movie" });
    if (watchlistError) throw watchlistError;

    const { error: movieLogError } = await adminClient
      .from("movie_logs")
      .insert({ user_id: userId, tmdb_movie_id: FIGHT_CLUB_TMDB_ID, rating: 4 });
    if (movieLogError) throw movieLogError;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
    await expect(page.getByRole("link", { name: /the matrix/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /fight club/i })).toBeVisible();
    await expect(page.getByText("No shows logged yet.")).toBeVisible();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test("shows a See all link once a section exceeds 4 items, and it navigates to the full list", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `e2e_user_${Date.now()}` },
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    const { error: watchlistError } = await adminClient.from("watchlist").insert(
      WATCHLIST_MOVIE_IDS.map((tmdbId) => ({
        user_id: userId,
        tmdb_id: tmdbId,
        media_type: "movie",
      })),
    );
    if (watchlistError) throw watchlistError;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto("/profile");
    const watchlistSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Watchlist" }) });

    await expect(watchlistSection.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/watchlist",
    );

    await watchlistSection.getByRole("link", { name: "See all" }).click();
    await expect(page).toHaveURL(/\/watchlist$/);
    await expect(page.getByRole("link", { name: /the matrix/i })).toBeVisible();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
