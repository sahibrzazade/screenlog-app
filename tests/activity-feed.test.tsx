import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ActivityFeed } from "@/components/activity-feed";
import { loadMoreActivity } from "@/app/activity-actions";
import type { ActivityItem } from "@/lib/activity";

vi.mock("@/app/activity-actions", () => ({ loadMoreActivity: vi.fn() }));

afterEach(cleanup);

const CREATED_AT = "2026-10-30T11:00:00.000Z";

const dune = { id: 438631, mediaType: "movie" as const, title: "Dune", year: "2021", posterPath: null };
const got = { id: 1399, mediaType: "tv" as const, title: "Game of Thrones", year: "2011", posterPath: null };

const movieLog: ActivityItem = {
  kind: "log",
  key: "movie_log:1",
  createdAt: CREATED_AT,
  userId: "u1",
  username: "alice",
  avatarUrl: null,
  title: dune,
  mediaType: "movie",
  tmdbId: 438631,
  seasonNumber: null,
  rating: 4,
  review: "Loved the sound design.",
  rewatch: false,
};

const seasonLog: ActivityItem = {
  ...movieLog,
  key: "season_log:2",
  title: got,
  mediaType: "tv",
  tmdbId: 1399,
  seasonNumber: 2,
  rating: null,
  review: null,
  rewatch: true,
};

const watchlistAdd: ActivityItem = {
  kind: "watchlist",
  key: "watchlist:3",
  createdAt: CREATED_AT,
  userId: "u2",
  username: "bob",
  avatarUrl: null,
  title: got,
  mediaType: "tv",
  tmdbId: 1399,
};

const followed: ActivityItem = {
  kind: "follow",
  key: "follow:u3",
  createdAt: CREATED_AT,
  userId: "u3",
  username: "carol",
  avatarUrl: null,
  title: null,
};

describe("ActivityFeed", () => {
  beforeEach(() => {
    vi.mocked(loadMoreActivity).mockReset();
  });

  it("renders a movie log with rating, review and links", () => {
    render(<ActivityFeed initialItems={[movieLog]} initialCursor={null} />);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("alice watched Dune");
    expect(screen.getByRole("img", { name: "4 out of 5 stars" })).toBeInTheDocument();
    expect(screen.getByText("Loved the sound design.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dune" })).toHaveAttribute("href", "/movie/438631");
    expect(screen.getByRole("link", { name: "alice" })).toHaveAttribute("href", "/user/alice");
  });

  it("renders a season rewatch linking to the season page", () => {
    render(<ActivityFeed initialItems={[seasonLog]} initialCursor={null} />);
    expect(screen.getByRole("listitem")).toHaveTextContent(
      "alice rewatched Game of Thrones — Season 2",
    );
    expect(screen.getByRole("link", { name: "Game of Thrones — Season 2" })).toHaveAttribute(
      "href",
      "/tv/1399/season/2",
    );
  });

  it("renders watchlist additions and new followers", () => {
    render(<ActivityFeed initialItems={[watchlistAdd, followed]} initialCursor={null} />);
    const [first, second] = screen.getAllByRole("listitem");
    expect(first).toHaveTextContent("bob added Game of Thrones to their watchlist");
    expect(second).toHaveTextContent("carol followed you");
  });

  it("shows the empty state with a link to people search", () => {
    render(<ActivityFeed initialItems={[]} initialCursor={null} />);
    expect(screen.getByRole("link", { name: "Find people to follow" })).toHaveAttribute(
      "href",
      "/search?mode=people",
    );
  });

  it("hides 'Show more' when there is no next page", () => {
    render(<ActivityFeed initialItems={[movieLog]} initialCursor={null} />);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("appends the next page and follows its cursor", async () => {
    const cursor = { createdAt: CREATED_AT, key: "movie_log:1" };
    vi.mocked(loadMoreActivity).mockResolvedValue({ items: [followed], nextCursor: null });
    render(<ActivityFeed initialItems={[movieLog]} initialCursor={cursor} />);

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(await screen.findByText(/followed you/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(loadMoreActivity).toHaveBeenCalledWith(cursor);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("shows an error when loading more fails", async () => {
    vi.mocked(loadMoreActivity).mockRejectedValue(new Error("network"));
    render(
      <ActivityFeed
        initialItems={[movieLog]}
        initialCursor={{ createdAt: CREATED_AT, key: "movie_log:1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load more activity.");
  });
});
