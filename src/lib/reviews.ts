import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/components/review-list";

type ReviewTable = "movie_logs" | "show_logs" | "season_logs";

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

  const userIds = [...new Set(logs.map((log) => log.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles_public")
    .select("id, username")
    .in("id", userIds);

  const usernameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  return logs.map((log) => ({
    userId: log.user_id,
    username: usernameById.get(log.user_id) ?? null,
    rating: Number(log.rating),
    review: log.review,
    watchedDate: log.watched_date,
  }));
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

  const userIds = [...new Set(logs.map((log) => log.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles_public")
    .select("id, username")
    .in("id", userIds);

  const usernameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));

  const reviewsBySeason: Record<number, Review[]> = {};
  for (const log of logs) {
    const review: Review = {
      userId: log.user_id,
      username: usernameById.get(log.user_id) ?? null,
      rating: Number(log.rating),
      review: log.review,
      watchedDate: log.watched_date,
    };
    (reviewsBySeason[log.season_number] ??= []).push(review);
  }
  return reviewsBySeason;
};
