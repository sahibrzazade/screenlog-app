import { test, expect } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, logInAndWait } from "./helpers";

const THE_MATRIX_TMDB_ID = 603;
const BREAKING_BAD_TMDB_ID = 1396;

// Logging through the UI is covered by log-movie and log-show-season; here the
// logs are seeded straight into the DB so the tests are about the diary only.
const seed = async (table: string, row: Record<string, unknown>) => {
  const { error } = await adminClient.from(table).insert(row);
  if (error) throw error;
};

test("shows logged movies and seasons in the diary timeline under their month", async ({
  page,
}) => {
  const user = await createTestUser();

  try {
    await seed("movie_logs", {
      user_id: user.id,
      tmdb_movie_id: THE_MATRIX_TMDB_ID,
      rating: 3.5,
      review: "Great movie.",
      watched_date: "2020-01-01",
    });
    await seed("season_logs", {
      user_id: user.id,
      tmdb_show_id: BREAKING_BAD_TMDB_ID,
      season_number: 1,
      rating: 4,
      watched_date: "2020-02-01",
    });

    await logInAndWait(page, user.email);
    await page.goto("/diary");

    const january = page.getByRole("region", { name: "January 2020" });
    const movieEntry = january.getByRole("listitem");
    await expect(movieEntry).toHaveCount(1);
    await expect(movieEntry).toContainText("The Matrix");
    await expect(movieEntry).toContainText("Movie");
    await expect(movieEntry).toContainText("Has review");

    const february = page.getByRole("region", { name: "February 2020" });
    const seasonEntry = february.getByRole("listitem");
    await expect(seasonEntry).toHaveCount(1);
    await expect(seasonEntry).toContainText("Breaking Bad — Season 1");
    await expect(seasonEntry).not.toContainText("Has review");
  } finally {
    await deleteTestUser(user);
  }
});

test("orders diary entries newest first across movies, shows and seasons", async ({ page }) => {
  const user = await createTestUser();

  try {
    await seed("movie_logs", {
      user_id: user.id,
      tmdb_movie_id: THE_MATRIX_TMDB_ID,
      rating: 3.5,
      watched_date: "2020-01-01",
    });
    await seed("season_logs", {
      user_id: user.id,
      tmdb_show_id: BREAKING_BAD_TMDB_ID,
      season_number: 1,
      rating: 4,
      watched_date: "2020-02-01",
    });
    await seed("show_logs", {
      user_id: user.id,
      tmdb_show_id: BREAKING_BAD_TMDB_ID,
      rating: 5,
      watched_date: "2020-03-01",
    });

    await logInAndWait(page, user.email);
    await page.goto("/diary");

    // Month sections only (named "<Month> <year>"), not e.g. the toast region.
    await expect(page.getByRole("region", { name: /^\w+ \d{4}$/ })).toHaveText([
      /March 2020.*Breaking Bad.*Show/,
      /February 2020.*Breaking Bad — Season 1/,
      /January 2020.*The Matrix/,
    ]);
  } finally {
    await deleteTestUser(user);
  }
});
