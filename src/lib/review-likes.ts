import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewKind } from "@/lib/validation/review-like";

/** The log table and the `review_likes` FK column for each review kind (0018). */
export const REVIEW_KIND_TABLE = {
  movie: { table: "movie_logs", likeColumn: "movie_log_id" },
  show: { table: "show_logs", likeColumn: "show_log_id" },
  season: { table: "season_logs", likeColumn: "season_log_id" },
} as const satisfies Record<ReviewKind, { table: string; likeColumn: string }>;

export type LikeSummary = { likeCount: number; viewerLiked: boolean };

const NO_LIKES: LikeSummary = { likeCount: 0, viewerLiked: false };

/** Only written reviews can be liked (spec "Review likes"; the 0018 insert policy agrees). */
export const isLikeable = (review: string | null) => review !== null && review.trim().length > 0;

/** Like count + "did the viewer like it" per log id, from raw `review_likes` rows. */
export const summarizeLikes = (
  rows: { logId: string; userId: string }[],
  viewerId: string | null,
): Map<string, LikeSummary> => {
  const summary = new Map<string, LikeSummary>();
  for (const { logId, userId } of rows) {
    const current = summary.get(logId) ?? NO_LIKES;
    summary.set(logId, {
      likeCount: current.likeCount + 1,
      viewerLiked: current.viewerLiked || userId === viewerId,
    });
  }
  return summary;
};

export const likeSummaryOf = (summary: Map<string, LikeSummary>, logId: string): LikeSummary =>
  summary.get(logId) ?? NO_LIKES;

/**
 * Like summaries for the given logs of one kind. Reads every like row of
 * those logs — fine at this app's scale, and it gives counts and the
 * viewer's own like in one query. A failed read degrades to "no likes".
 */
export const fetchLikeSummaries = async (
  supabase: SupabaseClient,
  kind: ReviewKind,
  logIds: string[],
  viewerId: string | null,
): Promise<Map<string, LikeSummary>> => {
  if (logIds.length === 0) return new Map();

  const { likeColumn } = REVIEW_KIND_TABLE[kind];
  // Dynamic column name: the select-string type parser can't follow it.
  const columns: string = `user_id, ${likeColumn}`;
  const { data } = await supabase.from("review_likes").select(columns).in(likeColumn, logIds);
  const rows = (data ?? []) as unknown as Record<string, string>[];

  return summarizeLikes(
    rows.map((row) => ({ logId: row[likeColumn], userId: row.user_id })),
    viewerId,
  );
};
