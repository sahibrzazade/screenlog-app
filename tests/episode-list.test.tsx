import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EpisodeList } from "@/components/detail/episode-list";
import type { TmdbEpisode } from "@/lib/tmdb/types";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(() => {
  cleanup();
});

const episode = (overrides: Partial<TmdbEpisode> = {}): TmdbEpisode => ({
  id: 1,
  episode_number: 1,
  name: "Pilot",
  overview: "A chemistry teacher turns to crime.",
  air_date: "2008-01-20",
  still_path: "/still.jpg",
  vote_average: 8.2,
  vote_count: 500,
  ...overrides,
});

describe("EpisodeList", () => {
  it("renders one row per episode with number, name, air date, and overview", () => {
    render(
      <EpisodeList
        episodes={[
          episode({
            id: 1,
            episode_number: 1,
            name: "Pilot",
            air_date: "2008-01-20",
            overview: "A chemistry teacher turns to crime.",
          }),
          episode({
            id: 2,
            episode_number: 2,
            name: "Cat's in the Bag...",
            air_date: "2008-01-27",
            overview: "Walt and Jesse hit a setback in their new venture.",
          }),
        ]}
      />,
    );

    expect(screen.getByText("1. Pilot")).toBeInTheDocument();
    expect(screen.getByText("2. Cat's in the Bag...")).toBeInTheDocument();
    expect(screen.getByText("2008-01-20")).toBeInTheDocument();
    expect(
      screen.getByText("A chemistry teacher turns to crime."),
    ).toBeInTheDocument();
  });

  it("shows a placeholder when an episode has no still image", () => {
    render(<EpisodeList episodes={[episode({ still_path: null })]} />);
    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the TMDB rating when the episode has votes", () => {
    render(<EpisodeList episodes={[episode({ vote_average: 9.1, vote_count: 200 })]} />);
    expect(screen.getByText("9.1")).toBeInTheDocument();
  });

  it("omits the rating when the episode has no votes yet", () => {
    render(<EpisodeList episodes={[episode({ vote_count: 0 })]} />);
    expect(screen.queryByText("8.2")).not.toBeInTheDocument();
  });
});
