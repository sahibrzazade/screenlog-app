import type { User } from "@supabase/supabase-js";
import type { SupabaseServerClient } from "@/lib/supabase/auth";
import type { ShowStatus } from "@/lib/validation/show-log";

export type OwnLog = {
  id: string;
  rating: number | null;
  review: string | null;
  watchedDate: string;
};

/** One watch of a movie or season: its own log row (migration 0021). */
export type OwnWatch = OwnLog & { rewatch: boolean };

/**
 * Every watch the signed-in user logged of a movie or season, latest first
 * (newest date, then newest log). The first is the one the log card shows.
 * Empty for guests or when nothing is logged.
 */
export const fetchOwnWatches = async (
  supabase: SupabaseServerClient,
  user: User | null,
  table: "movie_logs" | "season_logs",
  match: Record<string, number>,
): Promise<OwnWatch[]> => {
  if (!user) return [];

  const { data } = await supabase
    .from(table)
    .select("id, rating, review, watched_date, rewatch")
    .match({ user_id: user.id, ...match })
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating === null ? null : Number(row.rating),
    review: row.review,
    watchedDate: row.watched_date,
    rewatch: row.rewatch,
  }));
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
