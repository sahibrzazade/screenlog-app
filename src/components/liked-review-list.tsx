import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";
import { DroppedBadge } from "@/components/dropped-badge";
import { ReviewLikes } from "@/components/review-list";
import type { LikedReview } from "@/lib/liked-reviews";
import { posterUrl } from "@/lib/tmdb/images";

const titleHref = (review: LikedReview) => {
  if (review.seasonNumber !== null) return `/tv/${review.tmdbId}/season/${review.seasonNumber}`;
  return review.mediaType === "movie" ? `/movie/${review.tmdbId}` : `/tv/${review.tmdbId}`;
};

/**
 * Liked reviews: poster + title (like the activity feed), then the review as
 * it reads on the title page (reviewer, stars, text) with the same likes
 * column on the right.
 */
export const LikedReviewList = ({ reviews, viewerId }: { reviews: LikedReview[]; viewerId: string | null }) => (
  <ul className="mt-4 flex flex-col">
    {reviews.map((review) => {
      const href = titleHref(review);
      const poster = posterUrl(review.title.posterPath);
      const titleText =
        review.seasonNumber !== null ? `${review.title.title} — Season ${review.seasonNumber}` : review.title.title;

      return (
        <li key={`${review.logKind}:${review.logId}`} className="flex gap-3 border-t border-border py-4 first:border-t-0 first:pt-0">
          <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
            <div className="relative h-18 w-12 overflow-hidden rounded bg-surface">
              {poster && <Image src={poster} alt="" fill sizes="48px" className="object-cover" />}
            </div>
          </Link>

          <div className="flex min-w-0 flex-1 flex-col">
            <Link href={href} className="font-medium text-foreground hover:underline">
              {titleText}
              {review.title.year && review.seasonNumber === null && (
                <span className="ml-1 font-normal text-muted-foreground">{review.title.year}</span>
              )}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="relative size-5 shrink-0 overflow-hidden rounded-full bg-surface">
                <Image src={review.avatarUrl || "/default-avatar.png"} alt="" fill sizes="20px" className="object-cover" />
              </span>
              {review.username ? (
                <Link href={`/user/${review.username}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {review.userId === viewerId ? "You" : review.username}
                </Link>
              ) : (
                <span className="text-muted-foreground">Anonymous</span>
              )}
              {review.rating !== null && <RatingStars value={review.rating} readOnly />}
              {review.dropped && <DroppedBadge />}
            </div>
            <p className="mt-1 line-clamp-4 text-sm">{review.review}</p>
          </div>

          <ReviewLikes review={review} viewerId={viewerId} />
        </li>
      );
    })}
  </ul>
);
