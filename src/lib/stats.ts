/**
 * Pure stats computation for /user/[username]/stats (see spec "Stats page").
 * No I/O here — `stats-data.ts` loads the logs and runtimes.
 */

export type StatsPeriod = number | "all";

export type StatsLog =
  | { kind: "movie"; tmdbId: number; rating: number | null; watchedDate: string }
  | {
      kind: "season";
      tmdbId: number;
      seasonNumber: number;
      rating: number | null;
      watchedDate: string;
      /** "I've watched this before" was ticked on this log. */
      rewatch: boolean;
    }
  | {
      kind: "show";
      tmdbId: number;
      status: "completed" | "dropped";
      rating: number | null;
      watchedDate: string;
    };

/** Minutes per movie id, and per show id → per regular season number. */
export type Runtimes = {
  movies: Map<number, number>;
  showSeasons: Map<number, Map<number, number>>;
};

export type StatsTotals = {
  films: number;
  shows: number;
  /** Whole hours of films + shows, rounded down — the headline number. */
  hours: number;
  /** Exact watch time in minutes per type (TMDB runtimes are whole minutes). */
  movieMinutes: number;
  showMinutes: number;
};

/** Entry counts for one bar: all entries, split into movie logs and TV (season + show) logs. */
export type EntryTally = { count: number; films: number; tv: number };

export type ActivityBar = { label: string } & EntryTally;

/** Ratings 0.5 → 5 in half-star steps, in histogram order. */
export const RATING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const yearOf = (log: StatsLog) => Number(log.watchedDate.slice(0, 4));

/** Raw `year` param → period: "all", a 4-digit year, or the current year for anything else. */
export const parseStatsPeriod = (raw: string | string[] | undefined, currentYear: number): StatsPeriod => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "all") return "all";
  return value !== undefined && /^\d{4}$/.test(value) ? Number(value) : currentYear;
};

/** Stats page URL for a period; the current year (the default) gets no `year` param. */
export const statsHref = (basePath: string, period: StatsPeriod, currentYear: number): string =>
  period === currentYear ? basePath : `${basePath}?year=${period}`;

/** Human label for a period: "2024" or "all time". */
export const periodLabel = (period: StatsPeriod): string =>
  period === "all" ? "all time" : String(period);

/** Selector years: the current year plus every year with a log, newest first. */
export const statsYears = (logs: StatsLog[], currentYear: number): number[] =>
  [...new Set([currentYear, ...logs.map(yearOf)])].sort((a, b) => b - a);

export const logsInPeriod = (logs: StatsLog[], period: StatsPeriod): StatsLog[] =>
  period === "all" ? logs : logs.filter((log) => yearOf(log) === period);

const sum = (values: Iterable<number>) => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};

/**
 * Films = distinct movies; Shows = distinct shows with a season or show log.
 * Hours count every watch (a movie or season can be logged more than once,
 * migration 0021): each movie log's runtime, plus per show either each
 * logged season watch, or — with a completed show log in the period — every
 * regular season once plus a season's rewatches on top. A completed show's
 * first season log is taken as the watch the show log already covers unless
 * it is marked as a rewatch, so a season's extra watches are
 * max(logs − 1, logs marked rewatch).
 */
export const computeTotals = (logs: StatsLog[], runtimes: Runtimes): StatsTotals => {
  let movieMinutes = 0;
  let showMinutes = 0;
  const movieIds = new Set<number>();
  const showIds = new Set<number>();
  const completedShows = new Set<number>();
  /** Show id → season number → how many times it was logged, and how many of those are marked rewatch. */
  const seasonWatches = new Map<number, Map<number, { logs: number; rewatches: number }>>();

  for (const log of logs) {
    if (log.kind === "movie") {
      movieIds.add(log.tmdbId);
      movieMinutes += runtimes.movies.get(log.tmdbId) ?? 0;
      continue;
    }
    showIds.add(log.tmdbId);
    if (log.kind === "show") {
      if (log.status === "completed") completedShows.add(log.tmdbId);
    } else {
      const seasons = seasonWatches.get(log.tmdbId) ?? new Map();
      const watches = seasons.get(log.seasonNumber) ?? { logs: 0, rewatches: 0 };
      seasons.set(log.seasonNumber, {
        logs: watches.logs + 1,
        rewatches: watches.rewatches + (log.rewatch ? 1 : 0),
      });
      seasonWatches.set(log.tmdbId, seasons);
    }
  }

  for (const showId of showIds) {
    const seasonMinutes = runtimes.showSeasons.get(showId);
    if (!seasonMinutes) continue;
    const completed = completedShows.has(showId);
    if (completed) showMinutes += sum(seasonMinutes.values());
    for (const [season, { logs, rewatches }] of seasonWatches.get(showId) ?? []) {
      const counted = completed ? Math.max(logs - 1, rewatches) : logs;
      showMinutes += (seasonMinutes.get(season) ?? 0) * counted;
    }
  }

  return {
    films: movieIds.size,
    shows: showIds.size,
    hours: Math.floor((movieMinutes + showMinutes) / 60),
    movieMinutes,
    showMinutes,
  };
};

const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;

/**
 * "13 days, 4 hours and 47 minutes": days / hours / minutes, zero units left
 * out ("0 minutes" when nothing). No months (they vary in length) and no
 * seconds (TMDB runtimes are whole minutes).
 */
export const formatWatchTime = (totalMinutes: number): string => {
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? plural(days, "day") : null,
    hours > 0 ? plural(hours, "hour") : null,
    minutes > 0 ? plural(minutes, "minute") : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return "0 minutes";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
};

/**
 * Entries per month (Jan–Dec) for a year; per year, oldest → newest, for all
 * time. Empty months/years are kept as zero bars so the axis stays continuous.
 */
export const activityBars = (logs: StatsLog[], period: StatsPeriod): ActivityBar[] => {
  if (period !== "all") {
    return MONTHS.map((label, index) => ({
      label,
      ...tally(logs.filter((log) => Number(log.watchedDate.slice(5, 7)) === index + 1)),
    }));
  }

  if (logs.length === 0) return [];
  const years = logs.map(yearOf);
  const first = Math.min(...years);
  const last = Math.max(...years);
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const year = first + index;
    return { label: String(year), ...tally(logs.filter((log) => yearOf(log) === year)) };
  });
};

const tally = (logs: StatsLog[]): EntryTally => {
  const films = logs.filter((log) => log.kind === "movie").length;
  return { count: logs.length, films, tv: logs.length - films };
};

/** Rated entries per half-star step (ten bars); unrated entries are left out. */
export const ratingDistribution = (logs: StatsLog[]): ({ rating: number } & EntryTally)[] =>
  RATING_STEPS.map((rating) => ({
    rating,
    ...tally(logs.filter((log) => log.rating === rating)),
  }));
