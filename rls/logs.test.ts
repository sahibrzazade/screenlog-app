import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// Reviews are columns on the three log tables, so these cover reviews too.
// Every log is public to read (0009) and writable only by its owner.
const tables = [
  { table: "movie_logs", row: { tmdb_movie_id: 603 } },
  { table: "show_logs", row: { tmdb_show_id: 1396 } },
  { table: "season_logs", row: { tmdb_show_id: 1396, season_number: 1 } },
] as const;

const REVIEW = "Alice's original review";

describe.each(tables)("$table", ({ table, row }) => {
  let alice: RlsUser;
  let bob: RlsUser;
  let aliceLogId: string;

  beforeAll(async () => {
    alice = await createRlsUser();
    bob = await createRlsUser();
  });

  afterAll(async () => {
    await deleteRlsUsers(alice, bob);
  });

  // A fresh log per test, so a test that (wrongly) succeeds cannot hide
  // behind the state another test left behind.
  beforeEach(async () => {
    await admin.from(table).delete().in("user_id", [alice.id, bob.id]);
    const { data, error } = await admin
      .from(table)
      .insert({ ...row, user_id: alice.id, rating: 4, review: REVIEW })
      .select("id")
      .single();
    if (error) throw error;
    aliceLogId = data.id;
  });

  /** The real state of Alice's log, read past RLS. */
  const aliceLog = async () => {
    const { data } = await admin
      .from(table)
      .select("user_id, rating, review")
      .eq("id", aliceLogId)
      .maybeSingle();
    return data;
  };

  describe("reading", () => {
    it("lets a guest read someone's log and review", async () => {
      const { data, error } = await guestClient()
        .from(table)
        .select("review")
        .eq("id", aliceLogId);

      expect(error).toBeNull();
      expect(data).toEqual([{ review: REVIEW }]);
    });
  });

  describe("another user", () => {
    it("cannot log on someone's behalf", async () => {
      const { error } = await bob.client
        .from(table)
        .insert({ ...row, user_id: alice.id });

      expectRlsViolation(error);
    });

    it("cannot edit someone's rating or review", async () => {
      const { data, error } = await bob.client
        .from(table)
        .update({ rating: 0.5, review: "Bob was here" })
        .eq("id", aliceLogId)
        .select();

      // RLS hides the row from the update: no error, nothing matched.
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await aliceLog()).toEqual({
        user_id: alice.id,
        rating: 4,
        review: REVIEW,
      });
    });

    it("cannot delete someone's log", async () => {
      const { data, error } = await bob.client
        .from(table)
        .delete()
        .eq("id", aliceLogId)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await aliceLog()).not.toBeNull();
    });

    it("cannot hand their own log over to someone else", async () => {
      const { data: bobLog } = await admin
        .from(table)
        .insert({ ...row, user_id: bob.id })
        .select("id")
        .single();

      const { error } = await bob.client
        .from(table)
        .update({ user_id: alice.id })
        .eq("id", bobLog!.id);

      expectRlsViolation(error);
      const { data } = await admin
        .from(table)
        .select("user_id")
        .eq("id", bobLog!.id)
        .single();
      expect(data!.user_id).toBe(bob.id);
    });
  });

  describe("a guest", () => {
    it("cannot write logs at all", async () => {
      const guest = guestClient();

      // Supabase grants `anon` table privileges by default, so it is the
      // policies (auth.uid() is null for a guest) that stop these writes.
      const insert = await guest.from(table).insert({ ...row, user_id: alice.id });
      expectRlsViolation(insert.error);

      const update = await guest
        .from(table)
        .update({ review: "guest" })
        .eq("id", aliceLogId)
        .select();
      const remove = await guest
        .from(table)
        .delete()
        .eq("id", aliceLogId)
        .select();
      for (const { error, data } of [update, remove]) {
        expect(error).toBeNull();
        expect(data).toEqual([]);
      }

      expect(await aliceLog()).toEqual({
        user_id: alice.id,
        rating: 4,
        review: REVIEW,
      });
    });
  });

  // Without this, a table that blocked everyone would pass every test above.
  describe("the owner", () => {
    it("can edit and delete their own log", async () => {
      const { data: updated, error: updateError } = await alice.client
        .from(table)
        .update({ rating: 5, review: "Changed my mind" })
        .eq("id", aliceLogId)
        .select("rating, review");

      expect(updateError).toBeNull();
      expect(updated).toEqual([{ rating: 5, review: "Changed my mind" }]);

      const { data: deleted, error: deleteError } = await alice.client
        .from(table)
        .delete()
        .eq("id", aliceLogId)
        .select("id");

      expect(deleteError).toBeNull();
      expect(deleted).toHaveLength(1);
      expect(await aliceLog()).toBeNull();
    });
  });
});
