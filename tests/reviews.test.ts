import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchReviews } from "@/lib/reviews";

/**
 * Minimal stand-in for the three queries fetchReviews makes: the log table
 * (select → match → order), profiles_public (select → in) and review_likes
 * (select → in). Each resolves to the rows given for that table.
 */
const fakeClient = (rowsByTable: Record<string, unknown[]>) =>
  ({
    from: (table: string) => {
      const result = Promise.resolve({ data: rowsByTable[table] ?? [] });
      const chain = {
        select: () => chain,
        match: () => chain,
        in: () => result,
        order: () => result,
      };
      return chain;
    },
  }) as unknown as SupabaseClient;

const log = (id: string, userId: string, review: string | null, rating: number | null = 4) => ({
  id,
  user_id: userId,
  rating,
  review,
  watched_date: "2026-01-01",
});

describe("fetchReviews", () => {
  it("lists only written reviews, leaving out rating-only and blank ones", async () => {
    const client = fakeClient({
      movie_logs: [log("l1", "u1", "Loved it."), log("l2", "u2", null), log("l3", "u3", "   ")],
      profiles_public: [{ id: "u1", username: "alice", avatar_url: null }],
    });

    const reviews = await fetchReviews(client, "movie_logs", { tmdb_movie_id: 1 }, null);

    expect(reviews.map((review) => review.logId)).toEqual(["l1"]);
    expect(reviews[0]).toMatchObject({ logKind: "movie", username: "alice", review: "Loved it.", rating: 4 });
  });

  it("attaches each review's like count and the viewer's own like", async () => {
    const client = fakeClient({
      season_logs: [log("l1", "u1", "Great season."), log("l2", "u2", "Slow start.")],
      profiles_public: [],
      review_likes: [
        { user_id: "viewer", season_log_id: "l1" },
        { user_id: "u9", season_log_id: "l1" },
      ],
    });

    const reviews = await fetchReviews(client, "season_logs", { tmdb_show_id: 1, season_number: 2 }, "viewer");

    expect(reviews.map(({ logId, likeCount, viewerLiked }) => ({ logId, likeCount, viewerLiked }))).toEqual([
      { logId: "l1", likeCount: 2, viewerLiked: true },
      { logId: "l2", likeCount: 0, viewerLiked: false },
    ]);
  });
});
