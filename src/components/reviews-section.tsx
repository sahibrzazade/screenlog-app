import Link from "next/link";
import { ReviewList, type Review } from "@/components/review-list";
import { reviewSortHref, sortReviews, type ReviewSort } from "@/lib/review-sort";

type ReviewsSectionProps = {
  /** Newest first, as fetchReviews returns them. */
  reviews: Review[];
  viewerId: string | null;
  sort: ReviewSort;
  /** The page's path without query, e.g. "/movie/550". */
  basePath: string;
};

const SORT_LABELS: Record<ReviewSort, string> = { recent: "Recent", popular: "Popular" };

/**
 * "Reviews" heading with a Recent | Popular switch and the list. The switch
 * is plain links (`?reviews=popular`), so it's linkable and works without JS;
 * it only appears once there are two reviews to order.
 */
export const ReviewsSection = ({ reviews, viewerId, sort, basePath }: ReviewsSectionProps) => (
  <section className="mt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Reviews</h2>
      {reviews.length > 1 && (
        <nav aria-label="Sort reviews" className="flex gap-1 rounded-md border border-border p-0.5">
          {(["recent", "popular"] as const).map((option) => {
            const active = option === sort;
            return (
              <Link
                key={option}
                href={reviewSortHref(basePath, option)}
                // Re-sorting shouldn't jump the page back to the top.
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`rounded px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {SORT_LABELS[option]}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
    <ReviewList reviews={sortReviews(reviews, sort)} viewerId={viewerId} />
  </section>
);
