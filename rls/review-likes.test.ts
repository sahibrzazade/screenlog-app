import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  admin,
  createRlsUser,
  deleteRlsUsers,
  expectRlsViolation,
  guestClient,
  type RlsUser,
} from "./helpers";

// A like goes from one user to someone else's written review, as themselves
// only (spec: "Review likes", 0018). The insert policy has one branch per log
// table, so the rules about the review itself run for all three.
const logTables = [
  { table: "movie_logs", fk: "movie_log_id", row: { tmdb_movie_id: 603 } },
  { table: "show_logs", fk: "show_log_id", row: { tmdb_show_id: 1396 } },
  {
    table: "season_logs",
    fk: "season_log_id",
    row: { tmdb_show_id: 1396, season_number: 1 },
  },
] as const;

describe("review likes", () => {
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
    // Deleting the logs cascades to their likes.
    for (const { table } of logTables) {
      await admin.from(table).delete().in("user_id", [alice.id, bob.id]);
    }
  });

  const createLog = async (
    { table, row }: (typeof logTables)[number],
    owner: RlsUser,
    review: string | null,
  ) => {
    const { data, error } = await admin
      .from(table)
      .insert({ ...row, user_id: owner.id, rating: 4, review })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  };

  const likesOf = async (fk: string, logId: string) => {
    const { data } = await admin
      .from("review_likes")
      .select("user_id")
      .eq(fk, logId);
    return data!.map((like) => like.user_id);
  };

  describe.each(logTables)("on $table", (log) => {
    it("lets a user like someone else's written review", async () => {
      const logId = await createLog(log, alice, "Worth it");

      const { error } = await bob.client
        .from("review_likes")
        .insert({ user_id: bob.id, [log.fk]: logId });

      expect(error).toBeNull();
      expect(await likesOf(log.fk, logId)).toEqual([bob.id]);
    });

    it("does not let a user like their own review", async () => {
      const logId = await createLog(log, bob, "My own take");

      const { error } = await bob.client
        .from("review_likes")
        .insert({ user_id: bob.id, [log.fk]: logId });

      expectRlsViolation(error);
      expect(await likesOf(log.fk, logId)).toEqual([]);
    });

    it.each([
      ["a rating-only log", null],
      ["a review that is only whitespace", "   "],
    ])("does not let a user like %s", async (_, review) => {
      const logId = await createLog(log, alice, review);

      const { error } = await bob.client
        .from("review_likes")
        .insert({ user_id: bob.id, [log.fk]: logId });

      expectRlsViolation(error);
      expect(await likesOf(log.fk, logId)).toEqual([]);
    });
  });

  describe("on movie_logs", () => {
    const movie = logTables[0];

    it("lets a guest read who liked a review", async () => {
      const logId = await createLog(movie, alice, "Worth it");
      await admin.from("review_likes").insert({ user_id: bob.id, movie_log_id: logId });

      const { data, error } = await guestClient()
        .from("review_likes")
        .select("user_id")
        .eq("movie_log_id", logId);

      expect(error).toBeNull();
      expect(data).toEqual([{ user_id: bob.id }]);
    });

    it("does not let a user like on someone else's behalf", async () => {
      // Bob tries to make Alice like Bob's own review.
      const logId = await createLog(movie, bob, "Like me");

      const { error } = await bob.client
        .from("review_likes")
        .insert({ user_id: alice.id, movie_log_id: logId });

      expectRlsViolation(error);
      expect(await likesOf("movie_log_id", logId)).toEqual([]);
    });

    it("does not let a user remove someone else's like", async () => {
      const logId = await createLog(movie, bob, "Bob's review");
      await admin.from("review_likes").insert({ user_id: alice.id, movie_log_id: logId });

      // Even the review's author cannot take a like off their review.
      const { data, error } = await bob.client
        .from("review_likes")
        .delete()
        .eq("movie_log_id", logId)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await likesOf("movie_log_id", logId)).toEqual([alice.id]);
    });

    it("does not let a user edit a like", async () => {
      const logId = await createLog(movie, alice, "Worth it");
      const { data: like } = await admin
        .from("review_likes")
        .insert({ user_id: bob.id, movie_log_id: logId })
        .select("id")
        .single();

      // There is no update policy at all (a like is never edited), so RLS
      // matches no row even for the like's own author.
      const { data, error } = await bob.client
        .from("review_likes")
        .update({ user_id: alice.id })
        .eq("id", like!.id)
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await likesOf("movie_log_id", logId)).toEqual([bob.id]);
    });

    it("lets a user unlike their own like", async () => {
      const logId = await createLog(movie, alice, "Worth it");
      await admin.from("review_likes").insert({ user_id: bob.id, movie_log_id: logId });

      const { data } = await bob.client
        .from("review_likes")
        .delete()
        .eq("movie_log_id", logId)
        .eq("user_id", bob.id)
        .select();

      expect(data).toHaveLength(1);
      expect(await likesOf("movie_log_id", logId)).toEqual([]);
    });

    it("does not let a guest like a review", async () => {
      const logId = await createLog(movie, alice, "Worth it");

      const { error } = await guestClient()
        .from("review_likes")
        .insert({ user_id: bob.id, movie_log_id: logId });

      expectRlsViolation(error);
      expect(await likesOf("movie_log_id", logId)).toEqual([]);
    });
  });
});
