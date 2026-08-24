import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test("collects a username at signup and saves it to the new profile", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  const username = `e2esu_${Date.now()}`;

  let userId: string | undefined;

  try {
    await page.goto("/signup");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign up" }).click();

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
  const takenUsername = `e2etk_${Date.now()}`;
  const existingEmail = `e2e-${Date.now()}@example.com`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email: existingEmail,
    password: "correct-horse-battery-staple",
    email_confirm: true,
    user_metadata: { username: takenUsername },
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    await page.goto("/signup");
    await page.getByLabel("Username").fill(takenUsername);
    await page.getByLabel("Email").fill(`e2e-new-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("That username is already taken.")).toBeVisible();
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test("gates a user without a username to /choose-username, and setting one unlocks the app", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  const username = `e2ech_${Date.now()}`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/choose-username$/);
    await expect(page.getByRole("heading", { name: "Choose a username" })).toBeVisible();

    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;
    expect(profile.username).toBe(username);
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test("lets a logged-in user change their username from /settings", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "correct-horse-battery-staple";
  const initialUsername = `e2eb4_${Date.now()}`;
  const newUsername = `e2eaf_${Date.now()}`;

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: initialUsername },
  });
  if (error) throw error;
  const userId = data.user.id;

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByLabel("Username")).toHaveValue(initialUsername);

    await page.getByLabel("Username").fill(newUsername);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Username updated")).toBeVisible();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    if (profileError) throw profileError;
    expect(profile.username).toBe(newUsername);
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});
