import { test, expect } from "@playwright/test";
import { adminClient, createTestUser, deleteTestUser, logInAndWait, logViaModal } from "./helpers";

const BREAKING_BAD_TMDB_ID = 1396;

test("rates two different seasons of the same show and confirms both persist independently", async ({
  page,
}) => {
  const user = await createTestUser();

  try {
    await logInAndWait(page, user.email);

    await page.goto(`/tv/${BREAKING_BAD_TMDB_ID}/season/1`);
    await expect(page.getByRole("heading", { name: "Season 1", level: 1 })).toBeVisible();
    await logViaModal(page, { date: "2020-02-01", review: "Great start.", rating: 4 });

    await page.goto(`/tv/${BREAKING_BAD_TMDB_ID}/season/2`);
    await expect(page.getByRole("heading", { name: "Season 2", level: 1 })).toBeVisible();
    await logViaModal(page, { date: "2020-03-01", review: "Even better.", rating: 5 });

    const { data: logs, error: selectError } = await adminClient
      .from("season_logs")
      .select("season_number, rating, review, watched_date")
      .eq("user_id", user.id)
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
    await deleteTestUser(user);
  }
});
