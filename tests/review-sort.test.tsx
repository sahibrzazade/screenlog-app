import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { parseReviewSort, reviewSortHref, sortReviews } from "@/lib/review-sort";
import { ReviewsSection } from "@/components/reviews-section";
import type { Review } from "@/components/review-list";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));
vi.mock("@/app/review-like-actions", () => ({ toggleReviewLike: vi.fn() }));
vi.mock("@/app/user/[username]/actions", () => ({ toggleFollow: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));

afterEach(cleanup);

const review = (logId: string, username: string, likeCount: number): Review => ({
  logId,
  logKind: "movie",
  likeCount,
  viewerLiked: false,
  userId: `user-${logId}`,
  username,
  avatarUrl: null,
  rating: 4,
  review: `${username}'s take`,
  watchedDate: "2026-01-01",
});

// Newest first, as fetchReviews returns them.
const newestFirst = [review("1", "newest", 1), review("2", "middle", 5), review("3", "oldest", 1)];

describe("parseReviewSort", () => {
  it("is popular only for ?reviews=popular", () => {
    expect(parseReviewSort("popular")).toBe("popular");
    expect(parseReviewSort(["popular", "recent"])).toBe("popular");
    for (const raw of [undefined, "", "recent", "POPULAR", "top"]) {
      expect(parseReviewSort(raw)).toBe("recent");
    }
  });
});

describe("reviewSortHref", () => {
  it("leaves the param out for recent, the default", () => {
    expect(reviewSortHref("/movie/550", "recent")).toBe("/movie/550");
    expect(reviewSortHref("/movie/550", "popular")).toBe("/movie/550?reviews=popular");
  });
});

describe("sortReviews", () => {
  it("keeps newest first for recent", () => {
    expect(sortReviews(newestFirst, "recent").map((r) => r.username)).toEqual(["newest", "middle", "oldest"]);
  });

  it("orders popular by likes, ties newest first, without mutating the input", () => {
    expect(sortReviews(newestFirst, "popular").map((r) => r.username)).toEqual(["middle", "newest", "oldest"]);
    expect(newestFirst.map((r) => r.username)).toEqual(["newest", "middle", "oldest"]);
  });
});

describe("ReviewsSection", () => {
  it("offers Recent | Popular links, marking the active one, and lists in that order", () => {
    render(<ReviewsSection reviews={newestFirst} viewerId={null} sort="popular" basePath="/movie/550" />);

    const nav = screen.getByRole("navigation", { name: "Sort reviews" });
    expect(within(nav).getByRole("link", { name: "Recent" })).toHaveAttribute("href", "/movie/550");
    expect(within(nav).getByRole("link", { name: "Recent" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Popular" })).toHaveAttribute("href", "/movie/550?reviews=popular");
    expect(within(nav).getByRole("link", { name: "Popular" })).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("middle"),
      expect.stringContaining("newest"),
      expect.stringContaining("oldest"),
    ]);
  });

  it("hides the switch when there's nothing to order", () => {
    render(<ReviewsSection reviews={[newestFirst[0]]} viewerId={null} sort="recent" basePath="/movie/550" />);
    expect(screen.getByRole("heading", { name: "Reviews" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Sort reviews" })).not.toBeInTheDocument();
  });
});
