import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import { todayIso } from "@/lib/date";
import type { TmdbMovieDetails, TmdbSeasonDetails, TmdbShowDetails } from "@/lib/tmdb/types";
import type { Runtimes, StatsLog } from "@/lib/stats";

/** TMDB caps `append_to_response` at 20 items per request. */
const APPEND_LIMIT = 20;

const toRating = (value: number | string | null) => (value === null ? null : Number(value));

/** Every movie / season / show log of a user, shaped for the stats computation. */
export const getStatsLogs = async (supabase: SupabaseClient, userId: string): Promise<StatsLog[]> => {
  const [{ data: movieLogs }, { data: seasonLogs }, { data: showLogs }] = await Promise.all([
    supabase.from("movie_logs").select("tmdb_movie_id, rating, watched_date").eq("user_id", userId),
    supabase
      .from("season_logs")
      .select("tmdb_show_id, season_number, rating, watched_date, rewatch")
      .eq("user_id", userId),
    supabase.from("show_logs").select("tmdb_show_id, status, rating, watched_date").eq("user_id", userId),
  ]);

  return [
    ...(movieLogs ?? []).map((log): StatsLog => ({
      kind: "movie",
      tmdbId: log.tmdb_movie_id,
      rating: toRating(log.rating),
      watchedDate: log.watched_date,
    })),
    ...(seasonLogs ?? []).map((log): StatsLog => ({
      kind: "season",
      tmdbId: log.tmdb_show_id,
      seasonNumber: log.season_number,
      rating: toRating(log.rating),
      watchedDate: log.watched_date,
      rewatch: log.rewatch === true,
    })),
    ...(showLogs ?? []).map((log): StatsLog => ({
      kind: "show",
      tmdbId: log.tmdb_show_id,
      status: log.status === "dropped" ? "dropped" : "completed",
      rating: toRating(log.rating),
      watchedDate: log.watched_date,
    })),
  ];
};

/** Minutes of a season's aired episodes (missing runtimes count as 0). */
export const airedSeasonMinutes = (season: TmdbSeasonDetails, today: string): number =>
  season.episodes
    .filter((episode) => episode.air_date !== null && episode.air_date <= today)
    .reduce((total, episode) => total + (episode.runtime ?? 0), 0);

/** Per regular season (season 0 / specials excluded) → aired minutes, batching seasons via append_to_response. */
const fetchShowSeasonMinutes = async (showId: number, today: string): Promise<Map<number, number>> => {
  const show = await tmdbFetch<TmdbShowDetails>(`/tv/${showId}`);
  const seasonNumbers = show.seasons.map((s) => s.season_number).filter((n) => n > 0);
  const minutes = new Map<number, number>();

  for (let start = 0; start < seasonNumbers.length; start += APPEND_LIMIT) {
    const batch = seasonNumbers.slice(start, start + APPEND_LIMIT);
    const details = await tmdbFetch<Record<string, TmdbSeasonDetails | undefined>>(`/tv/${showId}`, {
      append_to_response: batch.map((n) => `season/${n}`).join(","),
    });
    for (const n of batch) {
      const season = details[`season/${n}`];
      if (season) minutes.set(n, airedSeasonMinutes(season, today));
    }
  }
  return minutes;
};

/**
 * Resolves the runtimes the given logs need. A failed TMDB lookup drops only
 * that title's runtime (counted as 0), never the whole page.
 */
export const getRuntimes = async (logs: StatsLog[]): Promise<Runtimes> => {
  const today = todayIso();
  const movieIds = [...new Set(logs.filter((l) => l.kind === "movie").map((l) => l.tmdbId))];
  const showIds = [...new Set(logs.filter((l) => l.kind !== "movie").map((l) => l.tmdbId))];

  const runtimes: Runtimes = { movies: new Map(), showSeasons: new Map() };
  await Promise.all([
    ...movieIds.map(async (id) => {
      try {
        const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`);
        runtimes.movies.set(id, movie.runtime ?? 0);
      } catch {
        // skip: counted as 0
      }
    }),
    ...showIds.map(async (id) => {
      try {
        runtimes.showSeasons.set(id, await fetchShowSeasonMinutes(id, today));
      } catch {
        // skip: counted as 0
      }
    }),
  ]);
  return runtimes;
};
