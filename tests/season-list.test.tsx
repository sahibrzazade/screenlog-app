import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SeasonList } from "@/components/season-list";
import type { TmdbSeasonSummary } from "@/lib/tmdb/types";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(() => {
  cleanup();
});

const seasons: TmdbSeasonSummary[] = [
  {
    id: 1,
    season_number: 1,
    name: "Season 1",
    episode_count: 7,
    poster_path: null,
    air_date: "2008-01-20",
  },
  {
    id: 2,
    season_number: 2,
    name: "Season 2",
    episode_count: 13,
    poster_path: null,
    air_date: "2009-03-08",
  },
];

describe("SeasonList", () => {
  it("links each season to its own page", () => {
    render(<SeasonList tmdbShowId={1396} seasons={seasons} existingLogs={{}} />);

    expect(screen.getByText("Season 1").closest("a")).toHaveAttribute(
      "href",
      "/tv/1396/season/1",
    );
    expect(screen.getByText("Season 2").closest("a")).toHaveAttribute(
      "href",
      "/tv/1396/season/2",
    );
  });

  it("shows episode counts for each season", () => {
    render(<SeasonList tmdbShowId={1396} seasons={seasons} existingLogs={{}} />);

    expect(screen.getByText("7 episodes")).toBeInTheDocument();
    expect(screen.getByText("13 episodes")).toBeInTheDocument();
  });

  it("shows a rating badge for a season the user has logged", () => {
    render(
      <SeasonList
        tmdbShowId={1396}
        seasons={seasons}
        existingLogs={{ 1: { rating: 4.5, review: null, watchedDate: "2026-01-01" } }}
      />,
    );

    const season1Link = screen.getByText("Season 1").closest("a");
    expect(season1Link).toHaveTextContent("4.5");
  });

  it("shows no rating badge for a season the user hasn't logged", () => {
    render(
      <SeasonList
        tmdbShowId={1396}
        seasons={seasons}
        existingLogs={{ 1: { rating: 4.5, review: null, watchedDate: "2026-01-01" } }}
      />,
    );

    const season2Link = screen.getByText("Season 2").closest("a");
    expect(season2Link?.textContent).not.toMatch(/\d\.\d/);
  });
});
