import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";
import { DroppedBadge } from "@/components/dropped-badge";
import { Heart } from "lucide-react";
import { LikeCount, ReviewLikeButton } from "@/components/review-like-button";
import { isLikeable } from "@/lib/review-likes";
import type { ReviewKind } from "@/lib/validation/review-like";

export type Review = {
  /** The log row this review is (likes point at it, migration 0018). */
  logId: string;
  logKind: ReviewKind;
  likeCount: number;
  /** Whether the signed-in viewer liked it; always false for guests. */
  viewerLiked: boolean;
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  rating: number | null;
  review: string | null;
  watchedDate: string;
  /** Show reviews only: the reviewer marked the show dropped. */
  dropped?: boolean;
};

type ReviewListProps = {
  reviews: Review[];
  viewerId: string | null;
};

export const ReviewList = ({ reviews, viewerId }: ReviewListProps) => {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-4">
      {reviews.map((review) => (
        <li
          key={review.userId}
          className="border-t border-border pt-4 first:border-t-0 first:pt-0"
        >
          <div className="flex items-start gap-2">
            <div className="relative size-6 shrink-0 overflow-hidden rounded-full bg-surface">
              <Image
                src={review.avatarUrl || "/default-avatar.png"}
                alt=""
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
            {/* min-w-0: long review text wraps instead of pushing the likes column. */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                {review.username ? (
                  <Link href={`/user/${review.username}`} className="font-medium hover:underline">
                    {review.userId === viewerId ? "You" : review.username}
                  </Link>
                ) : (
                  <span className="font-medium">
                    {review.userId === viewerId ? "You" : "Anonymous"}
                  </span>
                )}
                {review.rating !== null && (
                  <RatingStars value={review.rating} readOnly />
                )}
                {review.dropped && <DroppedBadge />}
              </div>
              {review.review && <p className="mt-1 text-sm">{review.review}</p>}
            </div>
            {isLikeable(review.review) && <ReviewLikes review={review} viewerId={viewerId} />}
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Fixed-width trailing column, so every review's heart sits in the same place. */
const LIKES_COLUMN_CLASS = "flex w-8 shrink-0 flex-col items-center";

/**
 * Likes column to the right of a written review (heart over count, like
 * comment likes elsewhere): the toggle for someone else's review, a link to
 * log in for guests, and just the count on your own review (you can't like
 * it — spec "Review likes").
 */
const ReviewLikes = ({ review, viewerId }: { review: Review; viewerId: string | null }) => {
  const reviewerName = review.username ?? "Anonymous";

  if (review.userId === viewerId) {
    return review.likeCount > 0 ? (
      <div className={`${LIKES_COLUMN_CLASS} text-muted-foreground`}>
        <span className="inline-flex size-8 items-center justify-center">
          <Heart className="size-4" aria-hidden />
        </span>
        <LikeCount count={review.likeCount} />
      </div>
    ) : null;
  }

  if (!viewerId) {
    return (
      <div className={LIKES_COLUMN_CLASS}>
        <Link
          href="/login"
          aria-label={`Log in to like ${reviewerName}'s review`}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart className="size-4" aria-hidden />
        </Link>
        <LikeCount count={review.likeCount} />
      </div>
    );
  }

  return (
    <div className={LIKES_COLUMN_CLASS}>
      <ReviewLikeButton
        logKind={review.logKind}
        logId={review.logId}
        initialLiked={review.viewerLiked}
        initialCount={review.likeCount}
        reviewerName={reviewerName}
      />
    </div>
  );
};
