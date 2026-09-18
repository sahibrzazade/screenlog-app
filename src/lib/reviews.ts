import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/components/review-list";

type ReviewTable = "movie_logs" | "show_logs" | "season_logs";

type ReviewLogRow = {
  user_id: string;
  rating: number | string | null;
  review: string | null;
  watched_date: string;
};

/** A log row only surfaces as a review once it has a rating or written review. */
const hasReviewContent = (log: ReviewLogRow) =>
  log.rating !== null || log.review !== null;

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
  profileById: Map<string, ReviewerProfile>,
): Review => {
  const profile = profileById.get(log.user_id);
  return {
    userId: log.user_id,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    rating: log.rating === null ? null : Number(log.rating),
    review: log.review,
    watchedDate: log.watched_date,
  };
};

export const fetchReviews = async (
  supabase: SupabaseClient,
  table: ReviewTable,
  match: Record<string, number>,
): Promise<Review[]> => {
  const { data: logs } = await supabase
    .from(table)
    .select("user_id, rating, review, watched_date")
    .match(match)
    .order("created_at", { ascending: false });

  if (!logs || logs.length === 0) {
    return [];
  }

  const profileById = await fetchProfileMap(
    supabase,
    [...new Set(logs.map((log) => log.user_id as string))],
  );

  return logs.filter(hasReviewContent).map((log) => toReview(log, profileById));
};
