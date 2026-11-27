import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// Checks the harness itself: if these fail, every other RLS test is meaningless.
describe("RLS test setup", () => {
  let alice: RlsUser;
  let bob: RlsUser;

  beforeAll(async () => {
    alice = await createRlsUser();
    bob = await createRlsUser();
  });

  afterAll(async () => {
    await deleteRlsUsers(alice, bob);
  });

  it("signs each user in as themselves", async () => {
    const { data: a } = await alice.client.auth.getUser();
    const { data: b } = await bob.client.auth.getUser();

    expect(a.user?.id).toBe(alice.id);
    expect(b.user?.id).toBe(bob.id);
    expect(alice.id).not.toBe(bob.id);
  });

  it("creates a profile for each user through the signup trigger", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", [alice.id, bob.id]);

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });

  it("gives guests no session", async () => {
    const { data } = await guestClient().auth.getUser();
    expect(data.user).toBeNull();
  });

  it("reports a blocked insert as an RLS violation", async () => {
    const { error } = await bob.client
      .from("movie_logs")
      .insert({ user_id: alice.id, tmdb_movie_id: 603 });

    expectRlsViolation(error);
  });
});
