import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// Profiles are created by the signup trigger, publicly readable (0014) and
// editable only by their owner. There is no insert or delete policy: a
// profile comes and goes with its auth user.
describe("profiles", () => {
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
    const { error } = await admin
      .from("profiles")
      .update({
        username: alice.username,
        avatar_url: "/default-avatar.png",
        top_movie_ids: [603],
        top_show_ids: [1396],
        now_watching_show_id: 1396,
      })
      .eq("id", alice.id);
    if (error) throw error;
  });

  const aliceProfile = async () => {
    const { data } = await admin
      .from("profiles")
      .select("username, avatar_url, top_movie_ids, top_show_ids, now_watching_show_id")
      .eq("id", alice.id)
      .single();
    return data;
  };

  const ORIGINAL = () => ({
    username: alice.username,
    avatar_url: "/default-avatar.png",
    top_movie_ids: [603],
    top_show_ids: [1396],
    now_watching_show_id: 1396,
  });

  it("lets a guest read someone's public profile", async () => {
    const { data, error } = await guestClient()
      .from("profiles")
      .select("username, avatar_url, top_movie_ids, top_show_ids, now_watching_show_id")
      .eq("id", alice.id);

    expect(error).toBeNull();
    expect(data).toEqual([ORIGINAL()]);
  });

  it("does not let a signed-in user read columns outside the public set", async () => {
    const { error } = await bob.client
      .from("profiles")
      .select("created_at")
      .eq("id", alice.id);

    expectRlsViolation(error);
  });

  it.each([
    ["username", { username: "bob_took_this" }],
    ["avatar", { avatar_url: "https://example.com/bob.png" }],
    ["showcase", { top_movie_ids: [550], top_show_ids: [], now_watching_show_id: null }],
  ])("does not let another user change someone's %s", async (_, change) => {
    const { data, error } = await bob.client
      .from("profiles")
      .update(change)
      .eq("id", alice.id)
      // Only public columns: signed-in users cannot read the rest.
      .select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(await aliceProfile()).toEqual(ORIGINAL());
  });

  it("does not let a user take a username someone already has", async () => {
    const { error } = await bob.client
      .from("profiles")
      .update({ username: alice.username })
      .eq("id", bob.id);

    // The unique constraint, not RLS (23505 = unique_violation).
    expect(error?.code).toBe("23505");
  });

  it("does not let a user create or delete profiles directly", async () => {
    const insert = await bob.client
      .from("profiles")
      .insert({ id: crypto.randomUUID(), username: "made_up" });
    expectRlsViolation(insert.error);

    const remove = await bob.client
      .from("profiles")
      .delete()
      .eq("id", alice.id)
      .select("id");
    expect(remove.data).toEqual([]);
    expect(await aliceProfile()).not.toBeNull();
  });

  it("does not let a guest change a profile", async () => {
    const { data } = await guestClient()
      .from("profiles")
      .update({ username: "guest_was_here" })
      .eq("id", alice.id)
      .select("id");

    expect(data).toEqual([]);
    expect(await aliceProfile()).toEqual(ORIGINAL());
  });

  it("lets the owner change their own username and showcase", async () => {
    const username = `${alice.username}_new`;
    const { data, error } = await alice.client
      .from("profiles")
      .update({ username, top_movie_ids: [550, 603] })
      .eq("id", alice.id)
      .select("username, top_movie_ids");

    expect(error).toBeNull();
    expect(data).toEqual([{ username, top_movie_ids: [550, 603] }]);
  });
});

// Watchlists are public to read (0016); only the owner adds or removes.
// There is no update policy: an entry is added or removed, never edited.
describe("watchlist", () => {
  let alice: RlsUser;
  let bob: RlsUser;
  let aliceEntryId: string;

  beforeAll(async () => {
    alice = await createRlsUser();
    bob = await createRlsUser();
  });

  afterAll(async () => {
    await deleteRlsUsers(alice, bob);
  });

  beforeEach(async () => {
    await admin.from("watchlist").delete().in("user_id", [alice.id, bob.id]);
    const { data, error } = await admin
      .from("watchlist")
      .insert({ user_id: alice.id, tmdb_id: 603, media_type: "movie" })
      .select("id")
      .single();
    if (error) throw error;
    aliceEntryId = data.id;
  });

  const aliceWatchlist = async () => {
    const { data } = await admin
      .from("watchlist")
      .select("tmdb_id, media_type")
      .eq("user_id", alice.id)
      .order("tmdb_id");
    return data;
  };

  const ORIGINAL = [{ tmdb_id: 603, media_type: "movie" }];

  it("lets a guest read someone's watchlist", async () => {
    const { data, error } = await guestClient()
      .from("watchlist")
      .select("tmdb_id, media_type")
      .eq("user_id", alice.id);

    expect(error).toBeNull();
    expect(data).toEqual(ORIGINAL);
  });

  it("does not let another user add to someone's watchlist", async () => {
    const { error } = await bob.client
      .from("watchlist")
      .insert({ user_id: alice.id, tmdb_id: 550, media_type: "movie" });

    expectRlsViolation(error);
    expect(await aliceWatchlist()).toEqual(ORIGINAL);
  });

  it("does not let another user remove or change someone's entries", async () => {
    const remove = await bob.client
      .from("watchlist")
      .delete()
      .eq("id", aliceEntryId)
      .select();
    const update = await bob.client
      .from("watchlist")
      .update({ tmdb_id: 550 })
      .eq("id", aliceEntryId)
      .select();

    expect(remove.data).toEqual([]);
    expect(update.data).toEqual([]);
    expect(await aliceWatchlist()).toEqual(ORIGINAL);
  });

  it("does not let a guest change a watchlist", async () => {
    const guest = guestClient();
    const insert = await guest
      .from("watchlist")
      .insert({ user_id: alice.id, tmdb_id: 550, media_type: "movie" });
    const remove = await guest
      .from("watchlist")
      .delete()
      .eq("id", aliceEntryId)
      .select();

    expectRlsViolation(insert.error);
    expect(remove.data).toEqual([]);
    expect(await aliceWatchlist()).toEqual(ORIGINAL);
  });

  it("lets the owner add and remove titles", async () => {
    const add = await alice.client
      .from("watchlist")
      .insert({ user_id: alice.id, tmdb_id: 1396, media_type: "tv" });
    expect(add.error).toBeNull();

    const remove = await alice.client
      .from("watchlist")
      .delete()
      .eq("id", aliceEntryId)
      .select("id");
    expect(remove.data).toHaveLength(1);
    expect(await aliceWatchlist()).toEqual([{ tmdb_id: 1396, media_type: "tv" }]);
  });
});
