import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// Follows are public; only the follower can create or remove one (0015).
describe("follows", () => {
  let alice: RlsUser;
  let bob: RlsUser;

  beforeAll(async () => {
    alice = await createRlsUser();
    bob = await createRlsUser();
  });

  afterAll(async () => {
    await deleteRlsUsers(alice, bob);
  });

  beforeEach(async () => {
    await admin.from("follows").delete().in("follower_id", [alice.id, bob.id]);
  });

  /** Whether `follower` follows `following`, read past RLS. */
  const follows = async (follower: RlsUser, following: RlsUser) => {
    const { data } = await admin
      .from("follows")
      .select("follower_id")
      .eq("follower_id", follower.id)
      .eq("following_id", following.id);
    return data!.length === 1;
  };

  it("lets a guest read who follows whom", async () => {
    await admin.from("follows").insert({ follower_id: alice.id, following_id: bob.id });

    const { data, error } = await guestClient()
      .from("follows")
      .select("follower_id")
      .eq("following_id", bob.id);

    expect(error).toBeNull();
    expect(data).toEqual([{ follower_id: alice.id }]);
  });

  it("lets a user follow and unfollow as themselves", async () => {
    const follow = await bob.client
      .from("follows")
      .insert({ follower_id: bob.id, following_id: alice.id });
    expect(follow.error).toBeNull();
    expect(await follows(bob, alice)).toBe(true);

    const unfollow = await bob.client
      .from("follows")
      .delete()
      .eq("follower_id", bob.id)
      .eq("following_id", alice.id)
      .select();
    expect(unfollow.data).toHaveLength(1);
    expect(await follows(bob, alice)).toBe(false);
  });

  it("does not let a user make someone else follow anyone", async () => {
    // Bob tries to give himself a follower.
    const { error } = await bob.client
      .from("follows")
      .insert({ follower_id: alice.id, following_id: bob.id });

    expectRlsViolation(error);
    expect(await follows(alice, bob)).toBe(false);
  });

  it("does not let a user remove someone else's follow, even of themselves", async () => {
    await admin.from("follows").insert({ follower_id: alice.id, following_id: bob.id });

    const { data, error } = await bob.client
      .from("follows")
      .delete()
      .eq("follower_id", alice.id)
      .eq("following_id", bob.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await follows(alice, bob)).toBe(true);
  });

  it("does not let a user follow themselves", async () => {
    const { error } = await bob.client
      .from("follows")
      .insert({ follower_id: bob.id, following_id: bob.id });

    // The check constraint, not RLS (23514 = check_violation).
    expect(error?.code).toBe("23514");
  });

  it("does not let a guest follow anyone", async () => {
    const { error } = await guestClient()
      .from("follows")
      .insert({ follower_id: alice.id, following_id: bob.id });

    expectRlsViolation(error);
    expect(await follows(alice, bob)).toBe(false);
  });
});
