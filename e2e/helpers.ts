import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export const PASSWORD = "correct-horse-battery-staple";

/**
 * Short id that stays unique across parallel workers — `Date.now()` alone
 * collides when two tests start in the same millisecond, and usernames are
 * unique in the DB.
 */
export const uniqueId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type TestUser = { id: string; email: string; username: string | null };

/**
 * Creates a confirmed user straight through the admin API (no email sent).
 * Pass `username: null` for a user who still has to pick one.
 */
export const createTestUser = async (
  { username = `e2e_${uniqueId()}` }: { username?: string | null } = {},
): Promise<TestUser> => {
  const email = `e2e-${uniqueId()}@example.com`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    ...(username ? { user_metadata: { username } } : {}),
  });
  if (error) throw error;
  return { id: data.user.id, email, username };
};

export const deleteTestUser = async (user: TestUser) => {
  await adminClient.auth.admin.deleteUser(user.id);
};

/** Logs in through the form and waits until the navbar shows the session. */
export const logIn = async (page: Page, email: string) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
};

export const logInAndWait = async (page: Page, email: string) => {
  await logIn(page, email);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
};

/**
 * Logs the title open on the page through its log card: "Rate & review" opens
 * the modal, the form saves the date (and review), then the modal's stars save
 * the rating. Works for movies, shows and seasons (one shared component).
 */
export const logViaModal = async (
  page: Page,
  { date, review, rating }: { date: string; review?: string; rating?: number },
) => {
  await page.getByRole("button", { name: "Rate & review" }).click();
  // Closed <dialog>s aren't in the accessibility tree, so this is the open one.
  const modal = page.getByRole("dialog");

  await modal.getByLabel(/^(Watched date|Date finished)$/).fill(date);
  if (review) await modal.getByLabel("Review (optional)").fill(review);
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  // The button flips once the saved log is back from the server, so the rating
  // below goes to that log instead of creating another.
  await expect(modal.getByRole("button", { name: "Save changes" })).toBeVisible();

  if (rating !== undefined) {
    await modal
      .getByLabel(`Rate ${rating} out of 5 stars`, { exact: true })
      .check({ force: true });
    await expect(page.getByText("Rating saved", { exact: true })).toBeVisible();
  }

  await modal.getByRole("button", { name: "Close" }).click();
  await expect(modal).toBeHidden();
};

/** Deletes the card's log through the in-app confirm dialog. */
export const deleteLogFromCard = async (page: Page) => {
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .filter({ hasText: "Delete your rating and review?" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Deleted", { exact: true })).toBeVisible();
};
