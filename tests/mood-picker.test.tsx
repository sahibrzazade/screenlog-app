import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MoodPicker } from "@/components/mood-picker";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockDiscoverResponses = (movieResults: unknown[], tvResults: unknown[]) => {
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const isMovie = url.includes("type=movie");
    const results = isMovie ? movieResults : tvResults;
    return new Response(
      JSON.stringify({ page: 1, results, total_pages: 1, total_results: results.length }),
      { status: 200 },
    );
  });
};

describe("MoodPicker", () => {
  it("renders every mood as a chip, with no results before any is clicked", () => {
    render(<MoodPicker userId={null} watchlistKeys={new Set()} />);

    expect(
      screen.getByRole("button", { name: /an adrenaline rush/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /an escape/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Movies" })).not.toBeInTheDocument();
  });

  it("fetches both movie and tv discover endpoints with the mood's genres on click", async () => {
    mockDiscoverResponses(
      [{ id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" }],
      [{ id: 1396, name: "Breaking Bad", poster_path: null, first_air_date: "2008-01-20" }],
    );

    render(<MoodPicker userId={null} watchlistKeys={new Set()} />);
    fireEvent.click(screen.getByRole("button", { name: /an adrenaline rush/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const calledUrls = vi.mocked(global.fetch).mock.calls.map((call) => String(call[0]));
    expect(
      calledUrls.some((url) => url.includes("genres=28,53") && url.includes("type=movie")),
    ).toBe(true);
    expect(
      calledUrls.some((url) => url.includes("genres=10759") && url.includes("type=tv")),
    ).toBe(true);

    expect(await screen.findByText("The Matrix")).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("replaces results instead of stacking when a different mood is clicked", async () => {
    mockDiscoverResponses(
      [{ id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" }],
      [],
    );
    render(<MoodPicker userId={null} watchlistKeys={new Set()} />);
    fireEvent.click(screen.getByRole("button", { name: /an adrenaline rush/i }));
    await screen.findByText("The Matrix");

    mockDiscoverResponses(
      [{ id: 27205, title: "Inception", poster_path: null, release_date: "2010-07-16" }],
      [],
    );
    fireEvent.click(screen.getByRole("button", { name: /a brain-twister/i }));

    await waitFor(() => expect(screen.getByText("Inception")).toBeInTheDocument());
    expect(screen.queryByText("The Matrix")).not.toBeInTheDocument();
  });

  it("marks the selected chip with aria-pressed", async () => {
    mockDiscoverResponses([], []);
    render(<MoodPicker userId={null} watchlistKeys={new Set()} />);

    const chip = screen.getByRole("button", { name: /an adrenaline rush/i });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(chip);
    await waitFor(() => expect(chip).toHaveAttribute("aria-pressed", "true"));
  });
});
