import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

export type DiaryEntry = {
  id: string;
  mediaType: "movie" | "season";
  title: string;
  posterPath: string | null;
  rating: number | null;
  review: string | null;
  watchedDate: string;
  href: string;
};

export type ShowRatingEntry = {
  id: string;
  title: string;
  posterPath: string | null;
  rating: number | null;
  review: string | null;
  href: string;
};

/** Pure merge/sort: combines movie + season entries, newest `watchedDate` first. */
export const sortDiaryEntries = (entries: DiaryEntry[]): DiaryEntry[] =>
  [...entries].sort((a, b) => b.watchedDate.localeCompare(a.watchedDate));

type MovieTitle = { title: string; posterPath: string | null };
type ShowTitle = {
  title: string;
  posterPath: string | null;
  seasonNames: Map<number, string>;
};

const fetchMovieTitles = async (ids: number[]): Promise<Map<number, MovieTitle>> => {
  const titles = new Map<number, MovieTitle>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`);
        titles.set(id, { title: movie.title, posterPath: movie.poster_path });
      } catch {
        // skip titles we can't resolve
      }
    }),
  );
  return titles;
};

const fetchShowTitles = async (ids: number[]): Promise<Map<number, ShowTitle>> => {
  const titles = new Map<number, ShowTitle>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const show = await tmdbFetch<TmdbShowDetails>(`/tv/${id}`);
        titles.set(id, {
          title: show.name,
          posterPath: show.poster_path,
          seasonNames: new Map(show.seasons.map((s) => [s.season_number, s.name])),
        });
      } catch {
        // skip titles we can't resolve
      }
    }),
  );
  return titles;
};

export const getDiaryData = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<{ entries: DiaryEntry[]; showRatings: ShowRatingEntry[] }> => {
  const [{ data: movieLogs }, { data: seasonLogs }, { data: showLogs }] = await Promise.all([
    supabase
      .from("movie_logs")
      .select("id, tmdb_movie_id, rating, review, watched_date")
      .eq("user_id", userId)
      .order("watched_date", { ascending: false }),
    supabase
      .from("season_logs")
      .select("id, tmdb_show_id, season_number, rating, review, watched_date")
      .eq("user_id", userId)
      .order("watched_date", { ascending: false }),
    supabase
      .from("show_logs")
      .select("id, tmdb_show_id, rating, review")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
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
        href: `/tv/${log.tmdb_show_id}`,
      },
    ];
  });

  const showRatings: ShowRatingEntry[] = (showLogs ?? []).flatMap((log) => {
    const show = showTitles.get(log.tmdb_show_id);
    if (!show) return [];
    return [
      {
        id: log.id,
        title: show.title,
        posterPath: show.posterPath,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        href: `/tv/${log.tmdb_show_id}`,
      },
    ];
  });

  return {
    entries: sortDiaryEntries([...movieEntries, ...seasonEntries]),
    showRatings,
  };
};
