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

/** username-by-id for the given user ids, read from the public profiles view. */
const fetchUsernameMap = async (
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string | null>> => {
  const { data: profiles } = await supabase
    .from("profiles_public")
    .select("id, username")
    .in("id", userIds);

  return new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
};

const toReview = (
  log: ReviewLogRow,
  usernameById: Map<string, string | null>,
): Review => ({
  userId: log.user_id,
  username: usernameById.get(log.user_id) ?? null,
  rating: log.rating === null ? null : Number(log.rating),
  review: log.review,
  watchedDate: log.watched_date,
});

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

  const usernameById = await fetchUsernameMap(
    supabase,
    [...new Set(logs.map((log) => log.user_id as string))],
  );

  return logs.filter(hasReviewContent).map((log) => toReview(log, usernameById));
};

export const fetchSeasonReviewsByNumber = async (
  supabase: SupabaseClient,
  tmdbShowId: number,
): Promise<Record<number, Review[]>> => {
  const { data: logs } = await supabase
    .from("season_logs")
    .select("user_id, season_number, rating, review, watched_date")
    .eq("tmdb_show_id", tmdbShowId)
    .order("created_at", { ascending: false });

  if (!logs || logs.length === 0) {
    return {};
  }

  const usernameById = await fetchUsernameMap(
    supabase,
    [...new Set(logs.map((log) => log.user_id as string))],
  );

  const reviewsBySeason: Record<number, Review[]> = {};
  for (const log of logs) {
    if (!hasReviewContent(log)) continue;
    (reviewsBySeason[log.season_number] ??= []).push(toReview(log, usernameById));
  }
  return reviewsBySeason;
};
