import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReviewList } from "@/components/review-list";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("@/app/review-like-actions", () => ({ toggleReviewLike: vi.fn() }));

afterEach(() => {
  cleanup();
});

// Like fields (subtask 3) — not what these tests are about.
const likeFields = { logKind: "movie" as const, likeCount: 0, viewerLiked: false };

const reviews = [
  {
    logId: "log-1",
    ...likeFields,
    userId: "user-1",
    username: "alice",
    avatarUrl: null,
    rating: 4.5,
    review: "Loved it.",
    watchedDate: "2026-01-01",
  },
  {
    logId: "log-2",
    ...likeFields,
    userId: "user-2",
    username: "bob",
    avatarUrl: "https://example.com/bob.jpg",
    rating: 3,
    review: null,
    watchedDate: "2026-01-02",
  },
];

describe("ReviewList", () => {
  it("renders a row per review with username, rating, and review text", () => {
    render(<ReviewList reviews={reviews} viewerId={null} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Loved it.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4.5 out of 5 stars" })).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 out of 5 stars" })).toBeInTheDocument();
  });

  it("labels the viewer's own row as You instead of their username", () => {
    render(<ReviewList reviews={reviews} viewerId="user-2" />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByText("bob")).not.toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("falls back to Anonymous when username is null", () => {
    render(
      <ReviewList
        reviews={[{ logId: "log-3", ...likeFields, userId: "user-3", username: null, avatarUrl: null, rating: 5, review: null, watchedDate: "2026-01-03" }]}
        viewerId={null}
      />,
    );
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("shows an empty state when there are no reviews", () => {
    render(<ReviewList reviews={[]} viewerId={null} />);
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("does not render review text when review is null", () => {
    render(
      <ReviewList
        reviews={[{ logId: "log-2", ...likeFields, userId: "user-2", username: "bob", avatarUrl: null, rating: 3, review: null, watchedDate: "2026-01-02" }]}
        viewerId={null}
      />,
    );
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("links a reviewer's username to their public profile", () => {
    render(<ReviewList reviews={reviews} viewerId={null} />);
    expect(screen.getByText("alice").closest("a")).toHaveAttribute(
      "href",
      "/user/alice",
    );
  });

  it("still links the viewer's own 'You' row to their public profile", () => {
    render(<ReviewList reviews={reviews} viewerId="user-2" />);
    expect(screen.getByText("You").closest("a")).toHaveAttribute(
      "href",
      "/user/bob",
    );
  });

  describe("likes", () => {
    const written = { ...reviews[0], likeCount: 2 };

    it("gives a signed-in viewer a like toggle on someone else's written review", () => {
      render(<ReviewList reviews={[written]} viewerId="user-9" />);
      expect(screen.getByRole("button", { name: "Like alice's review" })).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("2")).toHaveTextContent("2 likes");
    });

    it("sends guests to log in, keeping the count visible", () => {
      render(<ReviewList reviews={[written]} viewerId={null} />);
      expect(screen.getByRole("link", { name: "Log in to like alice's review" })).toHaveAttribute("href", "/login");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("2")).toHaveTextContent("2 likes");
    });

    it("shows only the count on the viewer's own review", () => {
      render(<ReviewList reviews={[written]} viewerId="user-1" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /like/i })).not.toBeInTheDocument();
      expect(screen.getByText("2")).toHaveTextContent("2 likes");
    });

    it("has no likes row for rating-only entries", () => {
      render(<ReviewList reviews={[reviews[1]]} viewerId="user-9" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  it("does not link an Anonymous (usernameless) row", () => {
    render(
      <ReviewList
        reviews={[{ logId: "log-3", ...likeFields, userId: "user-3", username: null, avatarUrl: null, rating: 5, review: null, watchedDate: "2026-01-03" }]}
        viewerId={null}
      />,
    );
    expect(screen.getByText("Anonymous").closest("a")).toBeNull();
  });
});
