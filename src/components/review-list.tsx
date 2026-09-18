import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";

export type Review = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  rating: number | null;
  review: string | null;
  watchedDate: string;
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
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
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
              </div>
              {review.review && <p className="mt-1 text-sm">{review.review}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};
