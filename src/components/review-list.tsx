import { CircleUserRound } from "lucide-react";
import { RatingStars } from "@/components/rating-stars";

export type Review = {
  userId: string;
  username: string | null;
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
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">No reviews yet.</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-4">
      {reviews.map((review) => (
        <li
          key={review.userId}
          className="border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0"
        >
          <div className="flex items-start gap-2">
            <CircleUserRound aria-hidden size={24} className="shrink-0 text-neutral-400" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {review.userId === viewerId ? "You" : (review.username ?? "Anonymous")}
                </span>
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
