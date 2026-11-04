import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/components/review-list";
import { fetchLikeSummaries, isLikeable, likeSummaryOf, type LikeSummary } from "@/lib/review-likes";
import type { ReviewKind } from "@/lib/validation/review-like";

type ReviewTable = "movie_logs" | "show_logs" | "season_logs";

const KIND_BY_TABLE: Record<ReviewTable, ReviewKind> = {
  movie_logs: "movie",
  show_logs: "show",
  season_logs: "season",
};

type ReviewLogRow = {
  id: string;
  user_id: string;
  rating: number | string | null;
  review: string | null;
  watched_date: string;
  /** Only selected from show_logs (migration 0017). */
  status?: string;
};

type ReviewerProfile = { username: string | null; avatarUrl: string | null };

/** username/avatar-by-id for the given user ids, read from the public profiles view. */
const fetchProfileMap = async (
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, ReviewerProfile>> => {
  const { data: profiles } = await supabase
    .from("profiles_public")
    .select("id, username, avatar_url")
    .in("id", userIds);

  return new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      { username: profile.username, avatarUrl: profile.avatar_url },
    ]),
  );
};

const toReview = (
  log: ReviewLogRow,
  kind: ReviewKind,
  profileById: Map<string, ReviewerProfile>,
  likes: LikeSummary,
): Review => {
  const profile = profileById.get(log.user_id);
  return {
    logId: log.id,
    logKind: kind,
    ...likes,
    userId: log.user_id,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    rating: log.rating === null ? null : Number(log.rating),
    review: log.review,
    watchedDate: log.watched_date,
    dropped: log.status === "dropped",
  };
};

/**
 * A title's (or season's) written reviews, newest first, each with its like count
 * and whether `viewerId` liked it (null for guests).
 */
export const fetchReviews = async (
  supabase: SupabaseClient,
  table: ReviewTable,
  match: Record<string, number>,
  viewerId: string | null,
): Promise<Review[]> => {
  // status exists only on show_logs. A conditional column list defeats the
  // client's select-string type parser, so the rows are typed explicitly.
  const columns: string =
    table === "show_logs"
      ? "id, user_id, rating, review, watched_date, status"
      : "id, user_id, rating, review, watched_date";
  const { data } = await supabase
    .from(table)
    .select(columns)
    .match(match)
    .order("created_at", { ascending: false });
  const logs = data as ReviewLogRow[] | null;

  if (!logs || logs.length === 0) {
    return [];
  }

  // Only written reviews are listed (spec "Review likes"): rating-only logs
  // have nothing to read and can't be liked. Followed users' ratings are
  // meant to surface in "friends who watched this" instead.
  const reviewLogs = logs.filter((log) => isLikeable(log.review));
  const kind = KIND_BY_TABLE[table];

  const [profileById, likes] = await Promise.all([
    fetchProfileMap(supabase, [...new Set(reviewLogs.map((log) => log.user_id))]),
    fetchLikeSummaries(
      supabase,
      kind,
      reviewLogs.map((log) => log.id),
      viewerId,
    ),
  ]);

  return reviewLogs.map((log) => toReview(log, kind, profileById, likeSummaryOf(likes, log.id)));
};
