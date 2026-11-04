import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";
import type { MediaCardItem } from "@/components/media-card";
import type { ShowStatus } from "@/lib/validation/show-log";
import { isLikeable } from "@/lib/review-likes";

export const ACTIVITY_PAGE_SIZE = 10;

type EventBase = {
  /** Stable, unique tiebreak for events with the same timestamp: "<source>:<row id>". */
  key: string;
  /** Postgres timestamptz string, full precision. */
  createdAt: string;
  /** Who did it: the logger, the watchlister, or the new follower. */
  userId: string;
};

export type ActivityEvent =
  | (EventBase & {
      kind: "log";
      mediaType: "movie" | "tv";
      tmdbId: number;
      /** Set for season logs only. */
      seasonNumber: number | null;
      rating: number | null;
      review: string | null;
      rewatch: boolean;
      /** Show logs only (migration 0017); null for movie and season logs. */
      showStatus: ShowStatus | null;
    })
  | (EventBase & { kind: "watchlist"; mediaType: "movie" | "tv"; tmdbId: number })
  | (EventBase & { kind: "follow" })
  | (EventBase & {
      /** userId liked reviewerId's review (migration 0018). */
      kind: "like";
      mediaType: "movie" | "tv";
      tmdbId: number;
      /** Set for season reviews only. */
      seasonNumber: number | null;
      reviewerId: string;
      /** The liked review's text, for the excerpt; empty ones are dropped before rendering. */
      review: string | null;
    });

/** Keyset cursor: the last event of the previous page. */
export type ActivityCursor = { createdAt: string; key: string };

export type ActivityItem = ActivityEvent & {
  username: string;
  avatarUrl: string | null;
  /** Resolved TMDB title for log/watchlist/like events; null for follow events. */
  title: MediaCardItem | null;
  /** Like events only: the review's author, or null when it's the viewer's own review ("your review"). */
  reviewerUsername?: string | null;
};

export type ActivityPage = { items: ActivityItem[]; nextCursor: ActivityCursor | null };

const toMs = (timestamp: string) => new Date(timestamp).getTime();

/**
 * Newest first. Ordering uses millisecond time (what JS can compare) and then
 * the key, so the order is total and identical on every page request.
 */
const compareEvents = (a: { createdAt: string; key: string }, b: { createdAt: string; key: string }) =>
  toMs(b.createdAt) - toMs(a.createdAt) || (a.key < b.key ? 1 : a.key > b.key ? -1 : 0);

/**
 * Merges per-source batches into one page. Each batch must hold that source's
 * newest `pageSize + 1` events at or before the cursor's millisecond — the
 * global top N is always within the union of per-source top Ns. Events at or
 * after the cursor (same-millisecond ties already shown) are dropped here.
 */
export const mergeActivity = (
  batches: ActivityEvent[][],
  cursor: ActivityCursor | null,
  pageSize = ACTIVITY_PAGE_SIZE,
): { events: ActivityEvent[]; nextCursor: ActivityCursor | null } => {
  // One event can come from two sources (a followed user liking the viewer's
  // review is both "liked by followed" and "liked yours"); keep it once.
  const unique = [...new Map(batches.flat().map((event) => [event.key, event])).values()];
  const merged = unique
    // Keep only events that sort strictly after the cursor (not yet shown).
    .filter((event) => !cursor || compareEvents(cursor, event) < 0)
    .sort(compareEvents);

  const events = merged.slice(0, pageSize);
  const last = events.at(-1);
  const nextCursor =
    merged.length > pageSize && last ? { createdAt: last.createdAt, key: last.key } : null;

  return { events, nextCursor };
};

/**
 * Upper bound for the per-source DB filter: one millisecond past the cursor,
 * so rows sharing the cursor's millisecond (but differing in microseconds,
 * which JS can't see) are still fetched and then ordered/dropped in JS.
 */
const cursorUpperBound = (cursor: ActivityCursor) =>
  new Date(toMs(cursor.createdAt) + 1).toISOString();

const toRating = (value: number | string | null) => (value === null ? null : Number(value));

/**
 * The select strings below are built dynamically, so supabase-js can't infer
 * row types from them; this is the one place those rows get their shape.
 */
const rowsOf = <Row>(result: { data: unknown }) => (result.data ?? []) as Row[];

type LogRow = {
  id: string;
  user_id: string;
  rating: number | string | null;
  review: string | null;
  rewatch: boolean;
  created_at: string;
};

/** The liked log, embedded through its review_likes FK (exactly one is non-null). */
type LikedLog = {
  user_id: string;
  review: string | null;
  tmdb_movie_id?: number;
  tmdb_show_id?: number;
  season_number?: number;
};

type LikeRow = {
  id: string;
  user_id: string;
  created_at: string;
  movie_logs?: LikedLog | null;
  show_logs?: LikedLog | null;
  season_logs?: LikedLog | null;
};

const LIKED_MOVIE = "movie_logs(user_id, review, tmdb_movie_id)";
const LIKED_SHOW = "show_logs(user_id, review, tmdb_show_id)";
const LIKED_SEASON = "season_logs(user_id, review, tmdb_show_id, season_number)";

/** A review_likes row (with its embedded log) → a "like" event; null if the log is missing. */
const toLikeEvent = (row: LikeRow): ActivityEvent | null => {
  const base = { kind: "like" as const, key: `review_like:${row.id}`, createdAt: row.created_at, userId: row.user_id };
  if (row.movie_logs) {
    const log = row.movie_logs;
    return { ...base, mediaType: "movie", tmdbId: log.tmdb_movie_id!, seasonNumber: null, reviewerId: log.user_id, review: log.review };
  }
  const log = row.show_logs ?? row.season_logs;
  if (!log) return null;
  return {
    ...base,
    mediaType: "tv",
    tmdbId: log.tmdb_show_id!,
    seasonNumber: log.season_number ?? null,
    reviewerId: log.user_id,
    review: log.review,
  };
};

/**
 * One page of the viewer's activity feed: logs, watchlist additions and
 * review likes by the people they follow, plus "followed you" and "liked
 * your review" events from anyone. Every source table is publicly readable
 * (0009, 0015, 0016, 0018).
 */
export const getActivityFeed = async (
  supabase: SupabaseClient,
  viewerId: string,
  cursor: ActivityCursor | null = null,
): Promise<ActivityPage> => {
  const limit = ACTIVITY_PAGE_SIZE + 1;
  const upperBound = cursor ? cursorUpperBound(cursor) : null;

  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);
  const followedIds = (followRows ?? []).map((row) => row.following_id as string);

  // Builds the shared "newest N by these users, before the cursor" query.
  const fromFollowed = (table: string, columns: string, timeColumn = "created_at") => {
    let query = supabase
      .from(table)
      .select(columns)
      .in("user_id", followedIds)
      .order(timeColumn, { ascending: false })
      .limit(limit);
    if (upperBound) query = query.lt(timeColumn, upperBound);
    return query;
  };

  const noRows = Promise.resolve({ data: [] });
  const hasFollowed = followedIds.length > 0;
  const logColumns = "id, user_id, rating, review, rewatch, created_at";

  let followersQuery = supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", viewerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (upperBound) followersQuery = followersQuery.lt("created_at", upperBound);

  // Likes of the viewer's own reviews, by anyone — one query per log table,
  // since the filter is on the embedded (inner-joined) log's owner.
  const likesOfViewer = (table: "movie_logs" | "show_logs" | "season_logs", embed: string) => {
    let query = supabase
      .from("review_likes")
      .select(`id, user_id, created_at, ${embed.replace(table, `${table}!inner`)}`)
      .eq(`${table}.user_id`, viewerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (upperBound) query = query.lt("created_at", upperBound);
    return query;
  };

  const [
    movieLogs,
    showLogs,
    seasonLogs,
    watchlist,
    followers,
    likesByFollowed,
    likesOfMovieReviews,
    likesOfShowReviews,
    likesOfSeasonReviews,
  ] = await Promise.all([
    hasFollowed ? fromFollowed("movie_logs", `${logColumns}, tmdb_movie_id`) : noRows,
    hasFollowed ? fromFollowed("show_logs", `${logColumns}, tmdb_show_id, status`) : noRows,
    hasFollowed
      ? fromFollowed("season_logs", `${logColumns}, tmdb_show_id, season_number`)
      : noRows,
    hasFollowed
      ? fromFollowed("watchlist", "id, user_id, tmdb_id, media_type, added_at", "added_at")
      : noRows,
    followersQuery,
    hasFollowed
      ? fromFollowed("review_likes", `id, user_id, created_at, ${LIKED_MOVIE}, ${LIKED_SHOW}, ${LIKED_SEASON}`)
      : noRows,
    likesOfViewer("movie_logs", LIKED_MOVIE),
    likesOfViewer("show_logs", LIKED_SHOW),
    likesOfViewer("season_logs", LIKED_SEASON),
  ]);

  const toLogEvent = (
    row: LogRow,
    source: string,
    mediaType: "movie" | "tv",
    tmdbId: number,
    seasonNumber: number | null,
    showStatus: ShowStatus | null = null,
  ): ActivityEvent => ({
    kind: "log",
    key: `${source}:${row.id}`,
    createdAt: row.created_at,
    userId: row.user_id,
    mediaType,
    tmdbId,
    seasonNumber,
    rating: toRating(row.rating),
    review: row.review,
    rewatch: row.rewatch,
    showStatus,
  });

  const batches: ActivityEvent[][] = [
    rowsOf<LogRow & { tmdb_movie_id: number }>(movieLogs).map((row) =>
      toLogEvent(row, "movie_log", "movie", row.tmdb_movie_id, null),
    ),
    rowsOf<LogRow & { tmdb_show_id: number; status: string }>(showLogs).map((row) =>
      toLogEvent(
        row,
        "show_log",
        "tv",
        row.tmdb_show_id,
        null,
        row.status === "dropped" ? "dropped" : "completed",
      ),
    ),
    rowsOf<LogRow & { tmdb_show_id: number; season_number: number }>(seasonLogs).map((row) =>
      toLogEvent(row, "season_log", "tv", row.tmdb_show_id, row.season_number),
    ),
    rowsOf<{
      id: string;
      user_id: string;
      tmdb_id: number;
      media_type: "movie" | "tv";
      added_at: string;
    }>(watchlist).map((row) => ({
      kind: "watchlist" as const,
      key: `watchlist:${row.id}`,
      createdAt: row.added_at,
      userId: row.user_id,
      mediaType: row.media_type,
      tmdbId: row.tmdb_id,
    })),
    rowsOf<{ follower_id: string; created_at: string }>(followers).map((row) => ({
      kind: "follow" as const,
      key: `follow:${row.follower_id}`,
      createdAt: row.created_at,
      userId: row.follower_id,
    })),
    ...[likesByFollowed, likesOfMovieReviews, likesOfShowReviews, likesOfSeasonReviews].map((likes) =>
      rowsOf<LikeRow>(likes).flatMap((row) => toLikeEvent(row) ?? []),
    ),
  ];

  const { events, nextCursor } = mergeActivity(batches, cursor);
  if (events.length === 0) return { items: [], nextCursor };

  const userIds = [
    ...new Set(
      events.flatMap((event) =>
        event.kind === "like" && event.reviewerId !== viewerId ? [event.userId, event.reviewerId] : [event.userId],
      ),
    ),
  ];
  const titleKeys = [
    ...new Set(
      events.flatMap((event) =>
        event.kind === "follow" ? [] : [`${event.mediaType}:${event.tmdbId}`],
      ),
    ),
  ];

  const [{ data: profiles }, titles] = await Promise.all([
    supabase.from("profiles_public").select("id, username, avatar_url").in("id", userIds),
    Promise.all(
      titleKeys.map(async (titleKey) => {
        const [mediaType, tmdbId] = titleKey.split(":");
        return [
          titleKey,
          await resolveMediaCardItem(Number(tmdbId), mediaType as "movie" | "tv"),
        ] as const;
      }),
    ),
  ]);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const titleByKey = new Map(titles);

  // Drop events we can't render: no username (no profile to link to), a
  // title TMDB couldn't resolve, or a like whose review has no text any more
  // (likes are kept when the text is cleared — spec "Review likes"). The
  // cursor still advances past them.
  const items = events.flatMap((event): ActivityItem[] => {
    const profile = profileById.get(event.userId);
    if (!profile?.username) return [];
    const title =
      event.kind === "follow" ? null : (titleByKey.get(`${event.mediaType}:${event.tmdbId}`) ?? null);
    if (event.kind !== "follow" && !title) return [];
    const item = { ...event, username: profile.username, avatarUrl: profile.avatar_url, title };
    if (event.kind !== "like") return [item];

    if (!isLikeable(event.review)) return [];
    if (event.reviewerId === viewerId) return [{ ...item, reviewerUsername: null }];
    const reviewer = profileById.get(event.reviewerId)?.username;
    return reviewer ? [{ ...item, reviewerUsername: reviewer }] : [];
  });

  return { items, nextCursor };
};
