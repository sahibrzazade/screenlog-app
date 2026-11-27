import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const;

/**
 * Bypasses RLS. Used only to set up rows and to read the real state of a row
 * after an attack, never to perform the action under test.
 */
export const admin = createClient(url, serviceRoleKey, clientOptions);

/** A visitor who is not signed in (the `anon` role). */
export const guestClient = (): SupabaseClient =>
  createClient(url, publishableKey, clientOptions);

const PASSWORD = "correct-horse-battery-staple";

const uniqueId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type RlsUser = {
  id: string;
  username: string;
  /** Signed in as this user: every request goes through RLS as them. */
  client: SupabaseClient;
};

/**
 * Creates a confirmed user (profile row comes from the signup trigger) and
 * signs them in on a client of their own, the way the browser app does.
 */
export const createRlsUser = async (): Promise<RlsUser> => {
  const id = uniqueId();
  const email = `rls-${id}@example.com`;
  const username = `rls_${id}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw error;

  const client = guestClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, username, client };
};

/** Deleting the auth user cascades to every row they own. */
export const deleteRlsUsers = async (...users: (RlsUser | undefined)[]) => {
  for (const user of users) {
    if (user) await admin.auth.admin.deleteUser(user.id);
  }
};

/**
 * An insert blocked by a `with check` policy fails with Postgres error 42501.
 * (Blocked updates and deletes do NOT error: they match zero rows, so tests
 * check the row through `admin` instead.)
 */
export const expectRlsViolation = (error: { code?: string } | null) => {
  expect(error, "expected the write to be rejected by RLS").not.toBeNull();
  expect(error!.code).toBe("42501");
};
