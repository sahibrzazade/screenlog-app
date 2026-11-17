import { test, expect } from "@playwright/test";
import {
  adminClient,
  createTestUser,
  deleteLogFromCard,
  deleteTestUser,
  logInAndWait,
  logViaModal,
} from "./helpers";

const THE_MATRIX_TMDB_ID = 603;

test("logs a movie end-to-end and persists it in Supabase", async ({ page }) => {
  const user = await createTestUser();

  try {
    await logInAndWait(page, user.email);

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await expect(page.getByRole("heading", { name: "The Matrix" })).toBeVisible();

    await logViaModal(page, { date: "2020-01-01", review: "Great movie.", rating: 3.5 });

    const { data: log, error: selectError } = await adminClient
      .from("movie_logs")
      .select("rating, review, watched_date")
      .eq("user_id", user.id)
      .eq("tmdb_movie_id", THE_MATRIX_TMDB_ID)
      .single();

    if (selectError) throw selectError;
    expect(log.rating).toBe(3.5);
    expect(log.review).toBe("Great movie.");
    expect(log.watched_date).toBe("2020-01-01");

    await deleteLogFromCard(page);

    const { data: deletedLog } = await adminClient
      .from("movie_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("tmdb_movie_id", THE_MATRIX_TMDB_ID)
      .maybeSingle();

    expect(deletedLog).toBeNull();
  } finally {
    await deleteTestUser(user);
  }
});
