import { test, expect } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, logInAndWait } from "./helpers";

const THE_MATRIX_TMDB_ID = 603;

test("adds and removes a movie from the watchlist end-to-end", async ({ page }) => {
  const user = await createTestUser();

  try {
    await logInAndWait(page, user.email);

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "The Matrix" })).toBeVisible();

    await page.getByRole("button", { name: "Add to watchlist" }).click();
    await expect(page.getByText("Added to watchlist")).toBeVisible();
    await expect(page.getByRole("button", { name: "In watchlist" })).toBeVisible();

    const { data: added, error: selectError } = await adminClient
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
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
      .eq("user_id", user.id)
      .eq("tmdb_id", THE_MATRIX_TMDB_ID)
      .eq("media_type", "movie")
      .maybeSingle();
    expect(removed).toBeNull();
  } finally {
    await deleteTestUser(user);
  }
});
