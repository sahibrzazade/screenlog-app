import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchLikeSummaries,
  isLikeable,
  likeSummaryOf,
  summarizeLikes,
} from "@/lib/review-likes";
import { reviewLikeToggleSchema } from "@/lib/validation/review-like";

const VALID_UUID = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

describe("reviewLikeToggleSchema", () => {
  it("accepts a kind, a log uuid and the current liked flag", () => {
    const result = reviewLikeToggleSchema.safeParse({ logKind: "season", logId: VALID_UUID, liked: "true" });
    expect(result.success && result.data).toEqual({ logKind: "season", logId: VALID_UUID, liked: true });
  });

  it("rejects an unknown kind, a non-uuid id and a non-boolean flag", () => {
    expect(reviewLikeToggleSchema.safeParse({ logKind: "episode", logId: VALID_UUID, liked: "false" }).success).toBe(false);
    expect(reviewLikeToggleSchema.safeParse({ logKind: "movie", logId: "nope", liked: "false" }).success).toBe(false);
    expect(reviewLikeToggleSchema.safeParse({ logKind: "movie", logId: VALID_UUID, liked: "yes" }).success).toBe(false);
  });
});

describe("isLikeable", () => {
  it("is true only for written review text", () => {
    expect(isLikeable("Loved it.")).toBe(true);
    expect(isLikeable(null)).toBe(false);
    expect(isLikeable("   ")).toBe(false);
  });
});

describe("summarizeLikes", () => {
  it("counts likes per log and flags the viewer's own like", () => {
    const summary = summarizeLikes(
      [
        { logId: "a", userId: "u1" },
        { logId: "a", userId: "viewer" },
        { logId: "b", userId: "u2" },
      ],
      "viewer",
    );
    expect(likeSummaryOf(summary, "a")).toEqual({ likeCount: 2, viewerLiked: true });
    expect(likeSummaryOf(summary, "b")).toEqual({ likeCount: 1, viewerLiked: false });
  });

  it("gives logs without likes, and guests, no likes / not liked", () => {
    const summary = summarizeLikes([{ logId: "a", userId: "u1" }], null);
    expect(likeSummaryOf(summary, "a")).toEqual({ likeCount: 1, viewerLiked: false });
    expect(likeSummaryOf(summary, "missing")).toEqual({ likeCount: 0, viewerLiked: false });
  });
});

describe("fetchLikeSummaries", () => {
  const clientReturning = (data: unknown) => {
    const inFilter = vi.fn().mockResolvedValue({ data });
    const select = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ select }));
    return { client: { from } as unknown as SupabaseClient, from, select, inFilter };
  };

  it("reads the kind's FK column for the given logs", async () => {
    const { client, from, select, inFilter } = clientReturning([
      { user_id: "viewer", show_log_id: "log-1" },
      { user_id: "u2", show_log_id: "log-1" },
    ]);
    const summary = await fetchLikeSummaries(client, "show", ["log-1", "log-2"], "viewer");

    expect(from).toHaveBeenCalledWith("review_likes");
    expect(select).toHaveBeenCalledWith("user_id, show_log_id");
    expect(inFilter).toHaveBeenCalledWith("show_log_id", ["log-1", "log-2"]);
    expect(likeSummaryOf(summary, "log-1")).toEqual({ likeCount: 2, viewerLiked: true });
    expect(likeSummaryOf(summary, "log-2")).toEqual({ likeCount: 0, viewerLiked: false });
  });

  it("skips the query when there are no logs and degrades to no likes on a failed read", async () => {
    const empty = clientReturning([]);
    expect((await fetchLikeSummaries(empty.client, "movie", [], null)).size).toBe(0);
    expect(empty.from).not.toHaveBeenCalled();

    const failed = clientReturning(null);
    expect((await fetchLikeSummaries(failed.client, "movie", ["log-1"], null)).size).toBe(0);
  });
});
