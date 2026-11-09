import type { SupabaseClient } from "@supabase/supabase-js";

/** Key of a watched title in the set `fetchWatchedTitleKeys` returns. */
export const watchedTitleKey = (mediaType: "movie" | "tv", id: number) => `${mediaType}-${id}`;

const fetchLoggedIds = async (
  supabase: SupabaseClient,
  table: "movie_logs" | "show_logs" | "season_logs",
  column: "tmdb_movie_id" | "tmdb_show_id",
  viewerId: string,
  ids: number[],
): Promise<number[]> => {
  if (ids.length === 0) return [];

  const { data } = await supabase.from(table).select(column).eq("user_id", viewerId).in(column, ids);

  return (data ?? []).map((row) => (row as Record<string, number>)[column]);
};

/**
 * Which of these titles the viewer has logged, as `watchedTitleKey`s. A movie
 * counts with any movie log; a show with a show log or any season log. Empty
 * for guests; a failed query counts as nothing watched.
 */
export const fetchWatchedTitleKeys = async (
  supabase: SupabaseClient,
  viewerId: string | null,
  movieIds: number[],
  showIds: number[],
): Promise<Set<string>> => {
  if (!viewerId) return new Set();

  const [movies, shows, seasons] = await Promise.all([
    fetchLoggedIds(supabase, "movie_logs", "tmdb_movie_id", viewerId, movieIds),
    fetchLoggedIds(supabase, "show_logs", "tmdb_show_id", viewerId, showIds),
    fetchLoggedIds(supabase, "season_logs", "tmdb_show_id", viewerId, showIds),
  ]);

  return new Set([
    ...movies.map((id) => watchedTitleKey("movie", id)),
    ...[...shows, ...seasons].map((id) => watchedTitleKey("tv", id)),
  ]);
};
