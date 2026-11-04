import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLikedReviews, LIKED_REVIEWS_PAGE_SIZE, type LikedReview } from "@/lib/liked-reviews";
import { LikedReviewList } from "@/components/liked-review-list";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";

vi.mock("@/lib/tmdb/resolve-media-card-item", () => ({ resolveMediaCardItem: vi.fn() }));
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

const logRow = (id: string, review: string | null, extra: Record<string, unknown>) => ({
  id,
  user_id: "reviewer",
  rating: 4,
  review,
  watched_date: "2026-01-01",
  ...extra,
});

/** review_likes (select → eq → order), profiles_public (select → in), like summaries (select → in). */
const fakeClient = (likeRows: unknown[]) =>
  ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => Promise.resolve({ data: likeRows }),
        in: () =>
          Promise.resolve({
            data: table === "profiles_public" ? [{ id: "reviewer", username: "bob", avatar_url: null }] : [],
          }),
      };
      return chain;
    },
  }) as unknown as SupabaseClient;

const title = (id: number, name: string) => ({ id, mediaType: "movie" as const, title: name, year: "2021", posterPath: null });

describe("getLikedReviews", () => {
  it("returns liked reviews newest first, skipping ones whose text was cleared", async () => {
    vi.mocked(resolveMediaCardItem).mockImplementation(async (id) => title(id, `Title ${id}`));
    const client = fakeClient([
      { movie_logs: logRow("m1", "Great.", { tmdb_movie_id: 550 }), show_logs: null, season_logs: null },
      { movie_logs: logRow("m2", null, { tmdb_movie_id: 551 }), show_logs: null, season_logs: null },
      { movie_logs: null, show_logs: null, season_logs: logRow("s1", "Best season.", { tmdb_show_id: 1399, season_number: 3 }) },
    ]);

    const { reviews, totalPages } = await getLikedReviews(client, "liker", null, undefined);

    expect(totalPages).toBe(1);
    expect(reviews.map((review) => [review.logId, review.logKind, review.seasonNumber])).toEqual([
      ["m1", "movie", null],
      ["s1", "season", 3],
    ]);
    expect(reviews[0]).toMatchObject({ username: "bob", tmdbId: 550, mediaType: "movie", likeCount: 0 });
    expect(reviews[1]).toMatchObject({ tmdbId: 1399, mediaType: "tv" });
  });

  it("pages the likes and clamps an out-of-range page", async () => {
    vi.mocked(resolveMediaCardItem).mockImplementation(async (id) => title(id, `Title ${id}`));
    const rows = Array.from({ length: LIKED_REVIEWS_PAGE_SIZE + 1 }, (_, index) => ({
      movie_logs: logRow(`m${index}`, "Text.", { tmdb_movie_id: index + 1 }),
      show_logs: null,
      season_logs: null,
    }));

    const second = await getLikedReviews(fakeClient(rows), "liker", null, "9");
    expect(second.totalPages).toBe(2);
    expect(second.currentPage).toBe(2);
    expect(second.reviews.map((review) => review.logId)).toEqual([`m${LIKED_REVIEWS_PAGE_SIZE}`]);
  });

  it("drops reviews whose title TMDB can't resolve", async () => {
    vi.mocked(resolveMediaCardItem).mockResolvedValue(null);
    const client = fakeClient([{ movie_logs: logRow("m1", "Great.", { tmdb_movie_id: 550 }), show_logs: null, season_logs: null }]);
    expect((await getLikedReviews(client, "liker", null, undefined)).reviews).toEqual([]);
  });
});

describe("LikedReviewList", () => {
  const liked: LikedReview = {
    logId: "s1",
    logKind: "season",
    likeCount: 3,
    viewerLiked: true,
    userId: "reviewer",
    username: "bob",
    avatarUrl: null,
    rating: 4,
    review: "Best season.",
    watchedDate: "2026-01-01",
    title: { id: 1399, mediaType: "tv", title: "Game of Thrones", year: "2011", posterPath: null },
    mediaType: "tv",
    tmdbId: 1399,
    seasonNumber: 3,
  };

  it("shows the title, reviewer, review and a working heart", () => {
    render(<LikedReviewList reviews={[liked]} viewerId="viewer" />);
    expect(screen.getByRole("link", { name: "Game of Thrones — Season 3" })).toHaveAttribute("href", "/tv/1399/season/3");
    expect(screen.getByRole("link", { name: "bob" })).toHaveAttribute("href", "/user/bob");
    expect(screen.getByText("Best season.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like bob's review" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "3 likes" })).toBeInTheDocument();
  });
});
