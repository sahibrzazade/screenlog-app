import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MoodResults } from "@/components/mood-results";
import type { MediaCardItem } from "@/components/media-card";
import { toggleWatchlist } from "@/app/watchlist/actions";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("@/app/watchlist/actions", () => ({
  toggleWatchlist: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.mocked(toggleWatchlist).mockReset();
});

const movie: MediaCardItem = {
  id: 1,
  mediaType: "movie",
  title: "The Matrix",
  year: "1999",
  posterPath: null,
};

const show: MediaCardItem = {
  id: 2,
  mediaType: "tv",
  title: "Breaking Bad",
  year: "2008",
  posterPath: null,
};

describe("MoodResults", () => {
  it("renders Movies and Shows headings with their items", () => {
    render(
      <MoodResults movies={[movie]} shows={[show]} userId={null} watchlistKeys={new Set()} />,
    );

    expect(screen.getByRole("heading", { name: "Movies" })).toBeInTheDocument();
    expect(screen.getByText("The Matrix")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Shows" })).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("shows an empty message for movies without hiding the shows row", () => {
    render(<MoodResults movies={[]} shows={[show]} userId={null} watchlistKeys={new Set()} />);

    expect(screen.getByText("No movies found for this mood.")).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("shows an empty message for shows without hiding the movies row", () => {
    render(<MoodResults movies={[movie]} shows={[]} userId={null} watchlistKeys={new Set()} />);

    expect(screen.getByText("The Matrix")).toBeInTheDocument();
    expect(screen.getByText("No shows found for this mood.")).toBeInTheDocument();
  });

  it("hides watchlist buttons for a logged-out visitor", () => {
    render(
      <MoodResults movies={[movie]} shows={[show]} userId={null} watchlistKeys={new Set()} />,
    );

    expect(screen.queryByRole("button", { name: /watchlist/i })).not.toBeInTheDocument();
  });

  it("shows watchlist buttons reflecting saved state for a logged-in visitor", () => {
    render(
      <MoodResults
        movies={[movie]}
        shows={[show]}
        userId="user-1"
        watchlistKeys={new Set(["movie-1"])}
      />,
    );

    expect(screen.getByRole("button", { name: "In watchlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeInTheDocument();
  });
});
