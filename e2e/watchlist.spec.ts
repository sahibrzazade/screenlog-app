import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;

test("adds and removes a movie from the watchlist end-to-end", async ({ page }) => {
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
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "The Matrix" })).toBeVisible();

    await page.getByRole("button", { name: "Add to watchlist" }).click();
    await expect(page.getByText("Added to watchlist")).toBeVisible();
    await expect(page.getByRole("button", { name: "In watchlist" })).toBeVisible();

    const { data: added, error: selectError } = await adminClient
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_id", THE_MATRIX_TMDB_ID)
      .eq("media_type", "movie")
      .single();
    if (selectError) throw selectError;
    expect(added).not.toBeNull();

    await page.goto("/watchlist");
    await expect(page.getByRole("link", { name: /the matrix/i })).toBeVisible();

    await page.getByRole("button", { name: "In watchlist" }).click();
    await expect(page.getByText("Removed from watchlist")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Nothing on your watchlist yet.")).toBeVisible();

    const { data: removed } = await adminClient
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_id", THE_MATRIX_TMDB_ID)
      .eq("media_type", "movie")
      .maybeSingle();
    expect(removed).toBeNull();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
