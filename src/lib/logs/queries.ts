import type { User } from "@supabase/supabase-js";
import type { SupabaseServerClient } from "@/lib/supabase/auth";
import type { ShowStatus } from "@/lib/validation/show-log";

export type OwnLog = {
  id: string;
  rating: number | null;
  review: string | null;
  watchedDate: string;
};

/**
 * The signed-in user's latest watch of a movie or season (newest date, then
 * newest log; migration 0021 allows several), shaped for the log form's
 * `initialLog` prop. Null for guests or when nothing is logged.
 */
export const fetchOwnLog = async (
  supabase: SupabaseServerClient,
  user: User | null,
  table: "movie_logs" | "season_logs",
  match: Record<string, number>,
): Promise<OwnLog | null> => {
  if (!user) return null;

  let query = supabase.from(table).select("id, rating, review, watched_date").eq("user_id", user.id);
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }
  const { data } = await query
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    rating: data.rating === null ? null : Number(data.rating),
    review: data.review,
    watchedDate: data.watched_date,
  };
};

/** The signed-in user's show log plus its completed/dropped status (migration 0017). */
export const fetchOwnShowLog = async (
  supabase: SupabaseServerClient,
  user: User | null,
  tmdbShowId: number,
): Promise<(OwnLog & { status: ShowStatus }) | null> => {
  if (!user) return null;

  const { data } = await supabase
    .from("show_logs")
    .select("id, rating, review, watched_date, status")
    .eq("user_id", user.id)
    .eq("tmdb_show_id", tmdbShowId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    rating: data.rating === null ? null : Number(data.rating),
    review: data.review,
    watchedDate: data.watched_date,
    status: data.status === "dropped" ? "dropped" : "completed",
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
