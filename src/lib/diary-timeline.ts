import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

export const DIARY_PAGE_SIZE = 50;

export type DiaryTimelineEntry = {
  id: string;
  mediaType: "movie" | "show" | "season";
  title: string;
  posterPath: string | null;
  /** Movies only: the release year, or null when TMDB has none. */
  year: string | null;
  rating: number | null;
  /** Only whether there is one: the timeline doesn't show review text. */
  hasReview: boolean;
  watchedDate: string;
  createdAt: string;
  href: string;
  dropped: boolean;
  /** Movies and seasons: "I've watched this before" was ticked. Always false for shows. */
  rewatch: boolean;
};

/** Keyset cursor: the last entry of the previous page. */
export type DiaryCursor = { watchedDate: string; createdAt: string; id: string };

export type DiaryPage = { entries: DiaryTimelineEntry[]; nextCursor: DiaryCursor | null };

/** A log row from any of the three tables, before its title is resolved. */
type DiaryLog = DiaryCursor & {
  mediaType: "movie" | "show" | "season";
  tmdbId: number;
  seasonNumber: number | null;
  rating: number | null;
  hasReview: boolean;
  dropped: boolean;
  rewatch: boolean;
};

const toMs = (timestamp: string) => new Date(timestamp).getTime();

/**
 * Newest watch date first, then newest `created_at`, then id. Times compare
 * in milliseconds (what JS can see), so the order is total and the same on
 * every page request.
 */
const compareLogs = (a: DiaryCursor, b: DiaryCursor) =>
  b.watchedDate.localeCompare(a.watchedDate) ||
  toMs(b.createdAt) - toMs(a.createdAt) ||
  (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/**
 * Merges per-table batches into one page. Each batch must hold that table's
 * newest `pageSize + 1` logs at or before the cursor (the global top N is
 * always within the union of per-table top Ns). Logs at or before the cursor
 * in sort order, i.e. already shown, are dropped here.
 */
export const mergeDiaryLogs = <Log extends DiaryCursor>(
  batches: Log[][],
  cursor: DiaryCursor | null,
  pageSize = DIARY_PAGE_SIZE,
): { logs: Log[]; nextCursor: DiaryCursor | null } => {
  const merged = batches
    .flat()
    .filter((log) => !cursor || compareLogs(cursor, log) < 0)
    .sort(compareLogs);

  const logs = merged.slice(0, pageSize);
  const last = logs.at(-1);
  const nextCursor =
    merged.length > pageSize && last
      ? { watchedDate: last.watchedDate, createdAt: last.createdAt, id: last.id }
      : null;

  return { logs, nextCursor };
};

type LogRow = {
  id: string;
  rating: number | string | null;
  review: string | null;
  watched_date: string;
  created_at: string;
  /** Selected from movie_logs and season_logs only. */
  rewatch?: boolean;
};

/**
 * The select strings are built from a shared column list, so supabase-js
 * can't infer row types from them; this is the one place rows get their shape.
 */
const rowsOf = <Row>(result: { data: unknown }) => (result.data ?? []) as Row[];

const toLog = (
  row: LogRow,
  mediaType: DiaryLog["mediaType"],
  tmdbId: number,
  seasonNumber: number | null = null,
  dropped = false,
): DiaryLog => ({
  id: row.id,
  watchedDate: row.watched_date,
  createdAt: row.created_at,
  mediaType,
  tmdbId,
  seasonNumber,
  rating: row.rating === null ? null : Number(row.rating),
  hasReview: Boolean(row.review?.trim()),
  dropped,
  rewatch: row.rewatch === true,
});

type MovieTitle = { title: string; posterPath: string | null; year: string | null };
type ShowTitle = { title: string; posterPath: string | null; seasonNames: Map<number, string> };

/** Resolves each id concurrently, leaving out any TMDB can't return. */
const resolveByIds = async <T>(ids: number[], resolve: (id: number) => Promise<T>) => {
  const resolved = new Map<number, T>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        resolved.set(id, await resolve(id));
      } catch {
        // A stale id or a network blip skips that title, not the page.
      }
    }),
  );
  return resolved;
};

const fetchMovieTitle = async (id: number): Promise<MovieTitle> => {
  const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`);
  return { title: movie.title, posterPath: movie.poster_path, year: movie.release_date?.slice(0, 4) || null };
};

const fetchShowTitle = async (id: number): Promise<ShowTitle> => {
  const show = await tmdbFetch<TmdbShowDetails>(`/tv/${id}`);
  return {
    title: show.name,
    posterPath: show.poster_path,
    seasonNames: new Map(show.seasons.map((season) => [season.season_number, season.name])),
  };
};

/**
 * One page of a user's diary: their movie, show and season logs in one list,
 * newest watch date first. Titles are resolved from TMDB for this page only.
 */
export const getDiaryPage = async (
  supabase: SupabaseClient,
  userId: string,
  cursor: DiaryCursor | null = null,
): Promise<DiaryPage> => {
  // One millisecond past the cursor, so rows sharing its millisecond (but
  // differing in microseconds, which JS can't see) are fetched and then
  // ordered or dropped in JS.
  const upperBound = cursor ? new Date(toMs(cursor.createdAt) + 1).toISOString() : null;

  const fromLogs = (table: string, columns: string) => {
    let query = supabase
      .from(table)
      .select(`id, rating, review, watched_date, created_at, ${columns}`)
      .eq("user_id", userId)
      .order("watched_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(DIARY_PAGE_SIZE + 1);
    if (cursor) {
      query = query.or(
        `watched_date.lt.${cursor.watchedDate},and(watched_date.eq.${cursor.watchedDate},created_at.lt.${upperBound})`,
      );
    }
    return query;
  };

  const [movieLogs, showLogs, seasonLogs] = await Promise.all([
    fromLogs("movie_logs", "tmdb_movie_id, rewatch"),
    fromLogs("show_logs", "tmdb_show_id, status"),
    fromLogs("season_logs", "tmdb_show_id, season_number, rewatch"),
  ]);

  const { logs, nextCursor } = mergeDiaryLogs(
    [
      rowsOf<LogRow & { tmdb_movie_id: number }>(movieLogs).map((row) =>
        toLog(row, "movie", row.tmdb_movie_id),
      ),
      rowsOf<LogRow & { tmdb_show_id: number; status: string }>(showLogs).map((row) =>
        toLog(row, "show", row.tmdb_show_id, null, row.status === "dropped"),
      ),
      rowsOf<LogRow & { tmdb_show_id: number; season_number: number }>(seasonLogs).map((row) =>
        toLog(row, "season", row.tmdb_show_id, row.season_number),
      ),
    ],
    cursor,
  );

  const idsOf = (isMovie: boolean) => [
    ...new Set(logs.filter((log) => (log.mediaType === "movie") === isMovie).map((log) => log.tmdbId)),
  ];
  const [movies, shows] = await Promise.all([
    resolveByIds(idsOf(true), fetchMovieTitle),
    resolveByIds(idsOf(false), fetchShowTitle),
  ]);

  // A log whose title TMDB couldn't resolve is left out; the cursor still
  // moves past it.
  const entries = logs.flatMap((log): DiaryTimelineEntry[] => {
    const base = {
      id: log.id,
      mediaType: log.mediaType,
      rating: log.rating,
      hasReview: log.hasReview,
      watchedDate: log.watchedDate,
      createdAt: log.createdAt,
      dropped: log.dropped,
      rewatch: log.rewatch,
    };

    if (log.mediaType === "movie") {
      const movie = movies.get(log.tmdbId);
      return movie
        ? [{ ...base, title: movie.title, posterPath: movie.posterPath, year: movie.year, href: `/movie/${log.tmdbId}` }]
        : [];
    }

    const show = shows.get(log.tmdbId);
    if (!show) return [];
    if (log.mediaType === "show") {
      return [{ ...base, title: show.title, posterPath: show.posterPath, year: null, href: `/tv/${log.tmdbId}` }];
    }
    const seasonName = show.seasonNames.get(log.seasonNumber!) ?? `Season ${log.seasonNumber}`;
    return [
      {
        ...base,
        title: `${show.title} — ${seasonName}`,
        posterPath: show.posterPath,
        year: null,
        href: `/tv/${log.tmdbId}/season/${log.seasonNumber}`,
      },
    ];
  });

  return { entries, nextCursor };
};

/** How many logs the user has across the three tables, for the diary header. */
export const getDiaryCount = async (supabase: SupabaseClient, userId: string) => {
  const results = await Promise.all(
    ["movie_logs", "show_logs", "season_logs"].map((table) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId),
    ),
  );
  return results.reduce((sum, { count }) => sum + (count ?? 0), 0);
};
