import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { WatchlistButton } from "@/components/watchlist-button";
import { toggleWatchlist } from "@/app/watchlist/actions";

vi.mock("@/app/watchlist/actions", () => ({
  toggleWatchlist: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

describe("WatchlistButton", () => {
  beforeEach(() => {
    vi.mocked(toggleWatchlist).mockReset();
  });

  it("shows 'Add to watchlist' when not in the watchlist", () => {
    render(
      <WatchlistButton
        tmdbId={550}
        mediaType="movie"
        initialInWatchlist={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeInTheDocument();
  });

  it("shows 'In watchlist' when already in the watchlist", () => {
    render(
      <WatchlistButton tmdbId={550} mediaType="movie" initialInWatchlist />,
    );
    expect(
      screen.getByRole("button", { name: "In watchlist" }),
    ).toBeInTheDocument();
  });

  it("submits tmdbId, mediaType, and current state to the action", async () => {
    vi.mocked(toggleWatchlist).mockResolvedValue({ inWatchlist: true });
    render(
      <WatchlistButton
        tmdbId={550}
        mediaType="movie"
        initialInWatchlist={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));

    await waitFor(() => expect(toggleWatchlist).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(toggleWatchlist).mock.calls[0][1];
    expect(formData.get("tmdbId")).toBe("550");
    expect(formData.get("mediaType")).toBe("movie");
    expect(formData.get("inWatchlist")).toBe("false");
  });

  it("flips to 'In watchlist' after the action resolves", async () => {
    vi.mocked(toggleWatchlist).mockResolvedValue({ inWatchlist: true });
    render(
      <WatchlistButton
        tmdbId={550}
        mediaType="movie"
        initialInWatchlist={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));

    expect(
      await screen.findByRole("button", { name: "In watchlist" }),
    ).toBeInTheDocument();
  });

  it("shows the error message returned by the action", async () => {
    vi.mocked(toggleWatchlist).mockResolvedValue({
      inWatchlist: false,
      error: "Failed to update your watchlist. Please try again.",
    });
    render(
      <WatchlistButton
        tmdbId={550}
        mediaType="movie"
        initialInWatchlist={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add to watchlist" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to update your watchlist. Please try again.",
    );
  });
});
