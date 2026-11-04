/** Order of a title's Reviews section (spec "Review likes" → Popular sort). */
export type ReviewSort = "recent" | "popular";

/** `?reviews=popular` → popular; anything else (or nothing) → recent, the default. */
export const parseReviewSort = (raw: string | string[] | undefined): ReviewSort => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "popular" ? "popular" : "recent";
};

/** The page URL for a sort; recent (the default) has no param. */
export const reviewSortHref = (basePath: string, sort: ReviewSort): string =>
  sort === "popular" ? `${basePath}?reviews=popular` : basePath;

/**
 * Reviews arrive newest first. Recent keeps that; popular orders by like
 * count, and the sort is stable, so ties stay newest first.
 */
export const sortReviews = <T extends { likeCount: number }>(reviews: T[], sort: ReviewSort): T[] =>
  sort === "popular" ? reviews.toSorted((a, b) => b.likeCount - a.likeCount) : reviews;
