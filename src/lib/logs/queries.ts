import type { User } from "@supabase/supabase-js";
import type { SupabaseServerClient } from "@/lib/supabase/auth";

export type OwnLog = {
  rating: number | null;
  review: string | null;
  watchedDate: string;
};

/**
 * The signed-in user's own movie/show log for a title, shaped for the log
 * form's `initialLog` prop. Null for guests or when nothing is logged.
 */
export const fetchOwnLog = async (
  supabase: SupabaseServerClient,
  user: User | null,
  table: "movie_logs" | "show_logs",
  idColumn: "tmdb_movie_id" | "tmdb_show_id",
  tmdbId: number,
): Promise<OwnLog | null> => {
  if (!user) return null;

  const { data } = await supabase
    .from(table)
    .select("rating, review, watched_date")
    .eq("user_id", user.id)
    .eq(idColumn, tmdbId)
    .maybeSingle();

  if (!data) return null;

  return {
    rating: data.rating === null ? null : Number(data.rating),
    review: data.review,
    watchedDate: data.watched_date,
  };
};

/** Whether the signed-in user has this title on their watchlist. */
export const isOnWatchlist = async (
  supabase: SupabaseServerClient,
  user: User | null,
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> => {
  if (!user) return false;

  const { data } = await supabase
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  return data !== null;
};
