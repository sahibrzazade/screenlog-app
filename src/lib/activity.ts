import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";
import type { MediaCardItem } from "@/components/media-card";

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
    })
  | (EventBase & { kind: "watchlist"; mediaType: "movie" | "tv"; tmdbId: number })
  | (EventBase & { kind: "follow" });

/** Keyset cursor: the last event of the previous page. */
export type ActivityCursor = { createdAt: string; key: string };

export type ActivityItem = ActivityEvent & {
  username: string;
  avatarUrl: string | null;
  /** Resolved TMDB title for log/watchlist events; null for follow events. */
  title: MediaCardItem | null;
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
  const merged = batches
    .flat()
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

/**
 * One page of the viewer's activity feed: logs and watchlist additions by
 * the people they follow, plus "followed you" events from anyone. Every
 * source table is publicly readable (0009, 0015, 0016).
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

  const [movieLogs, showLogs, seasonLogs, watchlist, followers] = await Promise.all([
    hasFollowed ? fromFollowed("movie_logs", `${logColumns}, tmdb_movie_id`) : noRows,
    hasFollowed ? fromFollowed("show_logs", `${logColumns}, tmdb_show_id`) : noRows,
    hasFollowed
      ? fromFollowed("season_logs", `${logColumns}, tmdb_show_id, season_number`)
      : noRows,
    hasFollowed
      ? fromFollowed("watchlist", "id, user_id, tmdb_id, media_type, added_at", "added_at")
      : noRows,
    followersQuery,
  ]);

  const toLogEvent = (
    row: LogRow,
    source: string,
    mediaType: "movie" | "tv",
    tmdbId: number,
    seasonNumber: number | null,
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
  });

  const batches: ActivityEvent[][] = [
    rowsOf<LogRow & { tmdb_movie_id: number }>(movieLogs).map((row) =>
      toLogEvent(row, "movie_log", "movie", row.tmdb_movie_id, null),
    ),
    rowsOf<LogRow & { tmdb_show_id: number }>(showLogs).map((row) =>
      toLogEvent(row, "show_log", "tv", row.tmdb_show_id, null),
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
  ];

  const { events, nextCursor } = mergeActivity(batches, cursor);
  if (events.length === 0) return { items: [], nextCursor };

  const userIds = [...new Set(events.map((event) => event.userId))];
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

  // Drop events we can't render: no username (no profile to link to) or a
  // title TMDB couldn't resolve. The cursor still advances past them.
  const items = events.flatMap((event): ActivityItem[] => {
    const profile = profileById.get(event.userId);
    if (!profile?.username) return [];
    const title =
      event.kind === "follow" ? null : (titleByKey.get(`${event.mediaType}:${event.tmdbId}`) ?? null);
    if (event.kind !== "follow" && !title) return [];
    return [{ ...event, username: profile.username, avatarUrl: profile.avatar_url, title }];
  });

  return { items, nextCursor };
};
