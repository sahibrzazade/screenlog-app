import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// Every list is public; only its owner can change it or its items (0019),
// including through reorder_list_items (0020, security invoker).
describe("lists and list items", () => {
  let alice: RlsUser;
  let bob: RlsUser;
  let aliceListId: string;
  let aliceItemIds: string[];
  let bobListId: string;

  beforeAll(async () => {
    alice = await createRlsUser();
    bob = await createRlsUser();
  });

  afterAll(async () => {
    await deleteRlsUsers(alice, bob);
  });

  beforeEach(async () => {
    await admin.from("lists").delete().in("user_id", [alice.id, bob.id]);

    const { data: lists, error } = await admin
      .from("lists")
      .insert([
        { user_id: alice.id, title: "Alice's list" },
        { user_id: bob.id, title: "Bob's list" },
      ])
      .select("id, user_id");
    if (error) throw error;
    aliceListId = lists.find((l) => l.user_id === alice.id)!.id;
    bobListId = lists.find((l) => l.user_id === bob.id)!.id;

    const { data: items, error: itemsError } = await admin
      .from("list_items")
      .insert([
        { list_id: aliceListId, tmdb_id: 603, media_type: "movie", position: 0 },
        { list_id: aliceListId, tmdb_id: 1396, media_type: "tv", position: 1 },
      ])
      .select("id, position");
    if (itemsError) throw itemsError;
    aliceItemIds = items
      .sort((a, b) => a.position - b.position)
      .map((i) => i.id);
  });

  const aliceList = async () => {
    const { data } = await admin
      .from("lists")
      .select("user_id, title")
      .eq("id", aliceListId)
      .maybeSingle();
    return data;
  };

  /** Alice's items in position order, as [tmdb_id, position] pairs. */
  const aliceItems = async () => {
    const { data } = await admin
      .from("list_items")
      .select("tmdb_id, position")
      .eq("list_id", aliceListId)
      .order("position");
    return data!.map((i) => [i.tmdb_id, i.position]);
  };

  const ORIGINAL_ITEMS = [
    [603, 0],
    [1396, 1],
  ];

  describe("reading", () => {
    it("lets a guest read someone's list and its items", async () => {
      const guest = guestClient();
      const { data: list } = await guest
        .from("lists")
        .select("title")
        .eq("id", aliceListId);
      const { data: items } = await guest
        .from("list_items")
        .select("tmdb_id")
        .eq("list_id", aliceListId);

      expect(list).toEqual([{ title: "Alice's list" }]);
      expect(items).toHaveLength(2);
    });
  });

  describe("another user", () => {
    it("cannot create a list on someone's behalf", async () => {
      const { error } = await bob.client
        .from("lists")
        .insert({ user_id: alice.id, title: "Made by Bob" });

      expectRlsViolation(error);
    });

    it("cannot rename someone's list", async () => {
      const { data, error } = await bob.client
        .from("lists")
        .update({ title: "Bob was here" })
        .eq("id", aliceListId)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await aliceList()).toEqual({ user_id: alice.id, title: "Alice's list" });
    });

    it("cannot delete someone's list", async () => {
      const { data } = await bob.client
        .from("lists")
        .delete()
        .eq("id", aliceListId)
        .select();

      expect(data).toEqual([]);
      expect(await aliceList()).not.toBeNull();
    });

    it("cannot hand their own list over to someone else", async () => {
      const { error } = await bob.client
        .from("lists")
        .update({ user_id: alice.id })
        .eq("id", bobListId);

      expectRlsViolation(error);
    });

    it("cannot add a title to someone's list", async () => {
      const { error } = await bob.client
        .from("list_items")
        .insert({ list_id: aliceListId, tmdb_id: 550, media_type: "movie", position: 2 });

      expectRlsViolation(error);
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });

    it("cannot move or remove titles in someone's list", async () => {
      const update = await bob.client
        .from("list_items")
        .update({ position: 9 })
        .eq("id", aliceItemIds[0])
        .select();
      const remove = await bob.client
        .from("list_items")
        .delete()
        .eq("id", aliceItemIds[1])
        .select();

      expect(update.data).toEqual([]);
      expect(remove.data).toEqual([]);
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });

    it("cannot move a title from their list into someone's list", async () => {
      const { data: bobItem } = await admin
        .from("list_items")
        .insert({ list_id: bobListId, tmdb_id: 550, media_type: "movie", position: 0 })
        .select("id")
        .single();

      const { error } = await bob.client
        .from("list_items")
        .update({ list_id: aliceListId })
        .eq("id", bobItem!.id);

      expectRlsViolation(error);
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });

    it("cannot reorder someone's list through reorder_list_items", async () => {
      const { error } = await bob.client.rpc("reorder_list_items", {
        p_list_id: aliceListId,
        p_item_ids: [...aliceItemIds].reverse(),
      });

      // Runs as Bob, so RLS hides Alice's items: no error, nothing moves.
      expect(error).toBeNull();
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });
  });

  describe("a guest", () => {
    it("cannot call reorder_list_items at all", async () => {
      const { error } = await guestClient().rpc("reorder_list_items", {
        p_list_id: aliceListId,
        p_item_ids: [...aliceItemIds].reverse(),
      });

      // Execute is revoked from anon (0020).
      expect(error?.code).toBe("42501");
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });

    it("cannot create a list or add titles", async () => {
      const guest = guestClient();
      const list = await guest
        .from("lists")
        .insert({ user_id: alice.id, title: "Guest list" });
      const item = await guest
        .from("list_items")
        .insert({ list_id: aliceListId, tmdb_id: 550, media_type: "movie", position: 2 });

      expectRlsViolation(list.error);
      expectRlsViolation(item.error);
      expect(await aliceItems()).toEqual(ORIGINAL_ITEMS);
    });
  });

  describe("the owner", () => {
    it("can rename the list, add a title and reorder", async () => {
      const rename = await alice.client
        .from("lists")
        .update({ title: "Renamed" })
        .eq("id", aliceListId)
        .select("title");
      expect(rename.data).toEqual([{ title: "Renamed" }]);

      const add = await alice.client
        .from("list_items")
        .insert({ list_id: aliceListId, tmdb_id: 550, media_type: "movie", position: 2 })
        .select("id")
        .single();
      expect(add.error).toBeNull();

      const { error } = await alice.client.rpc("reorder_list_items", {
        p_list_id: aliceListId,
        p_item_ids: [add.data!.id, ...aliceItemIds],
      });
      expect(error).toBeNull();
      expect(await aliceItems()).toEqual([
        [550, 0],
        [603, 1],
        [1396, 2],
      ]);
    });

    it("can delete the list", async () => {
      const { data } = await alice.client
        .from("lists")
        .delete()
        .eq("id", aliceListId)
        .select("id");

      expect(data).toHaveLength(1);
      expect(await aliceList()).toBeNull();
    });
  });
});
