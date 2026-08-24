import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const THE_MATRIX_TMDB_ID = 603;

test("logs a movie end-to-end and persists it in Supabase", async ({ page }) => {
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

    await page.getByLabel("Rate 3.5 out of 5 stars").check({ force: true });
    await page.getByLabel("Watched date").fill("2020-01-01");
    await page.getByLabel("Review (optional)").fill("Great movie.");
    await page.getByRole("button", { name: "Log movie" }).click();

    await expect(page.getByText("Log saved")).toBeVisible();

    const { data: log, error: selectError } = await adminClient
      .from("movie_logs")
      .select("rating, review, watched_date")
      .eq("user_id", userId)
      .eq("tmdb_movie_id", THE_MATRIX_TMDB_ID)
      .single();

    if (selectError) throw selectError;
    expect(log.rating).toBe(3.5);
    expect(log.review).toBe("Great movie.");
    expect(log.watched_date).toBe("2020-01-01");

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete log" }).click();

    await expect(page.getByText("Log deleted")).toBeVisible();

    const { data: deletedLog } = await adminClient
      .from("movie_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("tmdb_movie_id", THE_MATRIX_TMDB_ID)
      .maybeSingle();

    expect(deletedLog).toBeNull();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
