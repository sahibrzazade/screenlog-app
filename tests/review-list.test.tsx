import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReviewList } from "@/components/review-list";

afterEach(() => {
  cleanup();
});

const reviews = [
  {
    userId: "user-1",
    username: "alice",
    rating: 4.5,
    review: "Loved it.",
    watchedDate: "2026-01-01",
  },
  {
    userId: "user-2",
    username: "bob",
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
        reviews={[{ userId: "user-3", username: null, rating: 5, review: null, watchedDate: "2026-01-03" }]}
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
        reviews={[{ userId: "user-2", username: "bob", rating: 3, review: null, watchedDate: "2026-01-02" }]}
        viewerId={null}
      />,
    );
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});
