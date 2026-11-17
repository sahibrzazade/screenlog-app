import { test, expect } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, logInAndWait } from "./helpers";

const THE_MATRIX_TMDB_ID = 603;
const FIGHT_CLUB_TMDB_ID = 550;
const WATCHLIST_MOVIE_IDS = [603, 155, 27205, 550, 13];

test("shows logged data per section and an empty state for sections with nothing yet", async ({
  page,
}) => {
  const user = await createTestUser();

  try {
    const { error: watchlistError } = await adminClient
      .from("watchlist")
      .insert({ user_id: user.id, tmdb_id: THE_MATRIX_TMDB_ID, media_type: "movie" });
    if (watchlistError) throw watchlistError;

    const { error: movieLogError } = await adminClient
      .from("movie_logs")
      .insert({ user_id: user.id, tmdb_movie_id: FIGHT_CLUB_TMDB_ID, rating: 4 });
    if (movieLogError) throw movieLogError;

    await logInAndWait(page, user.email);

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
    await expect(page.getByRole("link", { name: /the matrix/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /fight club/i })).toBeVisible();
    await expect(page.getByText("No shows logged yet.")).toBeVisible();
  } finally {
    await deleteTestUser(user);
  }
});

test("shows a See all link once a section exceeds 4 items, and it navigates to the full list", async ({
  page,
}) => {
  const user = await createTestUser();

  try {
    const { error: watchlistError } = await adminClient.from("watchlist").insert(
      WATCHLIST_MOVIE_IDS.map((tmdbId) => ({
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: "movie",
      })),
    );
    if (watchlistError) throw watchlistError;

    await logInAndWait(page, user.email);

    await page.goto("/profile");
    const watchlistSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Watchlist" }) });

    // Profile sections link to the public per-user pages.
    const watchlistPath = `/user/${user.username}/watchlist`;
    await expect(watchlistSection.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      watchlistPath,
    );

    await watchlistSection.getByRole("link", { name: "See all" }).click();
    await expect(page).toHaveURL(new RegExp(`${watchlistPath}$`));
    await expect(page.getByRole("link", { name: /the matrix/i })).toBeVisible();
  } finally {
    await deleteTestUser(user);
  }
});
