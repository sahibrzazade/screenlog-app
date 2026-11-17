import { test, expect } from "@playwright/test";
import {
  PASSWORD,
  adminClient,
  createTestUser,
  deleteTestUser,
  logIn,
  logInAndWait,
  uniqueId,
} from "./helpers";

test("collects a username at signup and saves it to the new profile", async ({ page }) => {
  const email = `e2e-${uniqueId()}@example.com`;
  const username = `e2esu_${uniqueId()}`;

  let userId: string | undefined;

  try {
    await page.goto("/signup");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();

    // The confirmation email goes to local Mailpit, never out.
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const { data: profile, error } = await adminClient
      .from("profiles_public")
      .select("id, username")
      .eq("username", username)
      .single();
    if (error) throw error;
    userId = profile.id;
    expect(profile.username).toBe(username);
  } finally {
    if (userId) await adminClient.auth.admin.deleteUser(userId);
  }
});

test("rejects signup with a username that's already taken", async ({ page }) => {
  const existing = await createTestUser({ username: `e2etk_${uniqueId()}` });

  try {
    await page.goto("/signup");
    await page.getByLabel("Username").fill(existing.username!);
    await page.getByLabel("Email").fill(`e2e-new-${uniqueId()}@example.com`);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("That username is already taken.")).toBeVisible();
  } finally {
    await deleteTestUser(existing);
  }
});

test("gates a user without a username to /choose-username, and setting one unlocks the app", async ({ page }) => {
  const user = await createTestUser({ username: null });
  const username = `e2ech_${uniqueId()}`;

  try {
    await logIn(page, user.email);

    await expect(page).toHaveURL(/\/choose-username$/);
    await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();

    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    expect(profile.username).toBe(username);
  } finally {
    await deleteTestUser(user);
  }
});

test("lets a logged-in user change their username from /settings", async ({ page }) => {
  const user = await createTestUser({ username: `e2eb4_${uniqueId()}` });
  const newUsername = `e2eaf_${uniqueId()}`;

  try {
    await logInAndWait(page, user.email);

    await page.goto("/settings");
    await expect(page.getByLabel("Username")).toHaveValue(user.username!);

    // The saved username sits behind an Edit button.
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Username").fill(newUsername);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Username updated")).toBeVisible();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    expect(profile.username).toBe(newUsername);
  } finally {
    await deleteTestUser(user);
  }
});
