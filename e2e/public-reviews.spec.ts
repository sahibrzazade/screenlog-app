import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteLogFromCard,
  deleteTestUser,
  logInAndWait,
  logViaModal,
} from "./helpers";

const THE_MATRIX_TMDB_ID = 603;

test("a logged-in user's review is publicly visible to a guest, and labeled You for the author", async ({
  page,
  browser,
}) => {
  const user = await createTestUser();

  try {
    await logInAndWait(page, user.email);

    await page.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
    await logViaModal(page, { date: "2020-01-01", review: "Public review text.", rating: 4 });

    // The reviews list is server-rendered; reload so it includes the new one.
    await page.reload();
    const reviewsSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Reviews" }) });
    await expect(reviewsSection.getByText("You", { exact: true })).toBeVisible();
    await expect(reviewsSection.getByText("Public review text.")).toBeVisible();

    const guestContext = await browser.newContext();
    try {
      const guestPage = await guestContext.newPage();
      await guestPage.goto(`/movie/${THE_MATRIX_TMDB_ID}`);
      await expect(guestPage.getByRole("heading", { name: "The Matrix" })).toBeVisible();
      const guestReviewsSection = guestPage
        .locator("section")
        .filter({ has: guestPage.getByRole("heading", { name: "Reviews" }) });
      await expect(guestReviewsSection.getByText(user.username!)).toBeVisible();
      await expect(guestReviewsSection.getByText("Public review text.")).toBeVisible();
      await expect(guestReviewsSection.getByText("You", { exact: true })).not.toBeVisible();
    } finally {
      await guestContext.close();
    }

    await deleteLogFromCard(page);
  } finally {
    await deleteTestUser(user);
  }
});
