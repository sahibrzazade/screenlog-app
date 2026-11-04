import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/components/review-list";
import type { MediaCardItem } from "@/components/media-card";
import { fetchLikeSummaries, isLikeable, likeSummaryOf } from "@/lib/review-likes";
import { parsePage } from "@/lib/pagination";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";
import type { ReviewKind } from "@/lib/validation/review-like";

export const LIKED_REVIEWS_PAGE_SIZE = 20;

/** A review someone liked, with the title it's about (for the liked reviews page). */
export type LikedReview = Review & {
  title: MediaCardItem;
  mediaType: "movie" | "tv";
  tmdbId: number;
  /** Season reviews only. */
  seasonNumber: number | null;
};

type LikedLogRow = {
  id: string;
  user_id: string;
  rating: number | string | null;
  review: string | null;
  watched_date: string;
  tmdb_movie_id?: number;
  tmdb_show_id?: number;
  season_number?: number;
  status?: string;
};

type LikeRow = {
  movie_logs: LikedLogRow | null;
  show_logs: LikedLogRow | null;
  season_logs: LikedLogRow | null;
};

const LOG_COLUMNS = "id, user_id, rating, review, watched_date";
const LIKE_SELECT =
  `movie_logs(${LOG_COLUMNS}, tmdb_movie_id), ` +
  `show_logs(${LOG_COLUMNS}, tmdb_show_id, status), ` +
  `season_logs(${LOG_COLUMNS}, tmdb_show_id, season_number)`;

type LikedLog = { kind: ReviewKind; log: LikedLogRow };

/** The single embedded log of a like row (exactly one FK is set, 0018). */
const likedLogOf = (row: LikeRow): LikedLog | null => {
  if (row.movie_logs) return { kind: "movie", log: row.movie_logs };
  if (row.show_logs) return { kind: "show", log: row.show_logs };
  if (row.season_logs) return { kind: "season", log: row.season_logs };
  return null;
};

export type LikedReviewsPage = { reviews: LikedReview[]; currentPage: number; totalPages: number };

/**
 * One page of the reviews `userId` liked, newest like first. Each carries
 * its like count and whether `viewerId` liked it, so hearts work here too.
 * Likes of reviews whose text was later cleared are left out (spec "Review
 * likes"), as are titles TMDB can't resolve.
 */
export const getLikedReviews = async (
  supabase: SupabaseClient,
  userId: string,
  viewerId: string | null,
  /** Raw `page` search param. */
  page: string | string[] | undefined,
): Promise<LikedReviewsPage> => {
  // Embedded selects can't be type-parsed from a built string; rows are typed below.
  const columns: string = LIKE_SELECT;
  const { data } = await supabase
    .from("review_likes")
    .select(columns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const liked = ((data ?? []) as unknown as LikeRow[])
    .map(likedLogOf)
    .filter((entry): entry is LikedLog => entry !== null && isLikeable(entry.log.review));

  const totalPages = Math.max(1, Math.ceil(liked.length / LIKED_REVIEWS_PAGE_SIZE));
  const currentPage = parsePage(page, totalPages);
  const start = (currentPage - 1) * LIKED_REVIEWS_PAGE_SIZE;
  const pageEntries = liked.slice(start, start + LIKED_REVIEWS_PAGE_SIZE);
  if (pageEntries.length === 0) return { reviews: [], currentPage, totalPages };

  const titleKey = ({ kind, log }: LikedLog) =>
    kind === "movie" ? `movie:${log.tmdb_movie_id}` : `tv:${log.tmdb_show_id}`;
  const idsOf = (kind: ReviewKind) =>
    pageEntries.filter((entry) => entry.kind === kind).map((entry) => entry.log.id);

  const [{ data: profiles }, titles, movieLikes, showLikes, seasonLikes] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("id, username, avatar_url")
      .in("id", [...new Set(pageEntries.map((entry) => entry.log.user_id))]),
    Promise.all(
      [...new Set(pageEntries.map(titleKey))].map(async (key) => {
        const [mediaType, tmdbId] = key.split(":");
        return [key, await resolveMediaCardItem(Number(tmdbId), mediaType as "movie" | "tv")] as const;
      }),
    ),
    fetchLikeSummaries(supabase, "movie", idsOf("movie"), viewerId),
    fetchLikeSummaries(supabase, "show", idsOf("show"), viewerId),
    fetchLikeSummaries(supabase, "season", idsOf("season"), viewerId),
  ]);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const titleByKey = new Map(titles);
  const likesByKind = { movie: movieLikes, show: showLikes, season: seasonLikes };

  const reviews = pageEntries.flatMap((entry): LikedReview[] => {
    const title = titleByKey.get(titleKey(entry));
    if (!title) return [];
    const { kind, log } = entry;
    const profile = profileById.get(log.user_id);
    return [
      {
        logId: log.id,
        logKind: kind,
        ...likeSummaryOf(likesByKind[kind], log.id),
        userId: log.user_id,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        rating: log.rating === null ? null : Number(log.rating),
        review: log.review,
        watchedDate: log.watched_date,
        dropped: log.status === "dropped",
        title,
        mediaType: kind === "movie" ? "movie" : "tv",
        tmdbId: kind === "movie" ? log.tmdb_movie_id! : log.tmdb_show_id!,
        seasonNumber: kind === "season" ? (log.season_number ?? null) : null,
      },
    ];
  });

  return { reviews, currentPage, totalPages };
};
