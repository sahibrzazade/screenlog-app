import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

export type DiaryEntry = {
  id: string;
  mediaType: "movie" | "season" | "show";
  title: string;
  posterPath: string | null;
  rating: number | null;
  review: string | null;
  watchedDate: string;
  createdAt: string;
  href: string;
};

/**
 * Pure merge/sort: combines entries from one or more log tables, newest
 * `watchedDate` first, breaking ties with `createdAt` (also newest first).
 */
export const sortDiaryEntries = (entries: DiaryEntry[]): DiaryEntry[] =>
  [...entries].sort(
    (a, b) =>
      b.watchedDate.localeCompare(a.watchedDate) ||
      b.createdAt.localeCompare(a.createdAt),
  );

type MovieTitle = { title: string; posterPath: string | null };
type ShowTitle = {
  title: string;
  posterPath: string | null;
  seasonNames: Map<number, string>;
};

/**
 * Resolves each id concurrently, dropping any that fail (a stale tmdb id, a
 * network blip) rather than failing the whole diary.
 */
const resolveByIds = async <T>(
  ids: number[],
  resolve: (id: number) => Promise<T>,
): Promise<Map<number, T>> => {
  const resolved = new Map<number, T>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        resolved.set(id, await resolve(id));
      } catch {
        // skip ids we can't resolve
      }
    }),
  );
  return resolved;
};

const fetchMovieTitles = (ids: number[]): Promise<Map<number, MovieTitle>> =>
  resolveByIds(ids, async (id) => {
    const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`);
    return { title: movie.title, posterPath: movie.poster_path };
  });

const fetchShowTitles = (ids: number[]): Promise<Map<number, ShowTitle>> =>
  resolveByIds(ids, async (id) => {
    const show = await tmdbFetch<TmdbShowDetails>(`/tv/${id}`);
    return {
      title: show.name,
      posterPath: show.poster_path,
      seasonNames: new Map(show.seasons.map((s) => [s.season_number, s.name])),
    };
  });

export const getDiaryData = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<{ movies: DiaryEntry[]; shows: DiaryEntry[] }> => {
  const [{ data: movieLogs }, { data: seasonLogs }, { data: showLogs }] = await Promise.all([
    supabase
      .from("movie_logs")
      .select("id, tmdb_movie_id, rating, review, watched_date, created_at")
      .eq("user_id", userId)
      .order("watched_date", { ascending: false }),
    supabase
      .from("season_logs")
      .select("id, tmdb_show_id, season_number, rating, review, watched_date, created_at")
      .eq("user_id", userId)
      .order("watched_date", { ascending: false }),
    supabase
      .from("show_logs")
      .select("id, tmdb_show_id, rating, review, watched_date, created_at")
      .eq("user_id", userId)
      .order("watched_date", { ascending: false }),
  ]);

  const movieIds = [...new Set((movieLogs ?? []).map((log) => log.tmdb_movie_id as number))];
  const showIds = [
    ...new Set([
      ...(seasonLogs ?? []).map((log) => log.tmdb_show_id as number),
      ...(showLogs ?? []).map((log) => log.tmdb_show_id as number),
    ]),
  ];

  const [movieTitles, showTitles] = await Promise.all([
    fetchMovieTitles(movieIds),
    fetchShowTitles(showIds),
  ]);

  const movieEntries: DiaryEntry[] = (movieLogs ?? []).flatMap((log) => {
    const movie = movieTitles.get(log.tmdb_movie_id);
    if (!movie) return [];
    return [
      {
        id: log.id,
        mediaType: "movie" as const,
        title: movie.title,
        posterPath: movie.posterPath,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        watchedDate: log.watched_date,
        createdAt: log.created_at,
        href: `/movie/${log.tmdb_movie_id}`,
      },
    ];
  });

  const seasonEntries: DiaryEntry[] = (seasonLogs ?? []).flatMap((log) => {
    const show = showTitles.get(log.tmdb_show_id);
    if (!show) return [];
    const seasonName =
      show.seasonNames.get(log.season_number) ?? `Season ${log.season_number}`;
    return [
      {
        id: log.id,
        mediaType: "season" as const,
        title: `${show.title} — ${seasonName}`,
        posterPath: show.posterPath,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        watchedDate: log.watched_date,
        createdAt: log.created_at,
        href: `/tv/${log.tmdb_show_id}`,
      },
    ];
  });

  const showEntries: DiaryEntry[] = (showLogs ?? []).flatMap((log) => {
    const show = showTitles.get(log.tmdb_show_id);
    if (!show) return [];
    return [
      {
        id: log.id,
        mediaType: "show" as const,
        title: show.title,
        posterPath: show.posterPath,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        watchedDate: log.watched_date,
        createdAt: log.created_at,
        href: `/tv/${log.tmdb_show_id}`,
      },
    ];
  });

  return {
    movies: sortDiaryEntries(movieEntries),
    shows: sortDiaryEntries([...seasonEntries, ...showEntries]),
  };
};
