import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WatchlistGrid } from "@/components/watchlist-grid";
import type { MediaCardItem } from "@/components/media-card";

vi.mock("@/app/watchlist/actions", () => ({
  toggleWatchlist: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

const items: MediaCardItem[] = [
  { id: 550, mediaType: "movie", title: "Fight Club", year: "1999", posterPath: null },
  { id: 1396, mediaType: "tv", title: "Breaking Bad", year: "2008", posterPath: null },
];

describe("WatchlistGrid", () => {
  it("shows a watchlist toggle on every card when editable (owner view)", () => {
    render(<WatchlistGrid initialItems={items} editable />);
    expect(screen.getAllByRole("button", { name: "In watchlist" })).toHaveLength(2);
  });

  it("renders a read-only grid by default (visitor view)", () => {
    render(<WatchlistGrid initialItems={items} />);
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the given empty message when there are no items", () => {
    render(<WatchlistGrid initialItems={[]} emptyMessage="Nothing on the watchlist yet." />);
    expect(screen.getByText("Nothing on the watchlist yet.")).toBeInTheDocument();
  });
});
