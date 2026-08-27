import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { WatchedButton } from "@/components/watched-button";
import { toggleMovieWatched } from "@/app/movie/[id]/actions";
import { toggleShowWatched } from "@/app/tv/[id]/actions";

vi.mock("@/app/movie/[id]/actions", () => ({
  toggleMovieWatched: vi.fn(),
}));

vi.mock("@/app/tv/[id]/actions", () => ({
  toggleShowWatched: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

describe("WatchedButton", () => {
  beforeEach(() => {
    vi.mocked(toggleMovieWatched).mockReset();
    vi.mocked(toggleShowWatched).mockReset();
  });

  it("shows 'Mark as watched' when not yet watched", () => {
    render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );
    expect(
      screen.getByRole("button", { name: "Mark as watched" }),
    ).toBeInTheDocument();
  });

  it("shows a 'Watched' state when already watched, and it stays clickable", () => {
    render(<WatchedButton tmdbId={550} mediaType="movie" initialIsWatched />);
    const button = screen.getByRole("button", { name: "Watched" });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("submits tmdbMovieId and current state to toggleMovieWatched for a movie", async () => {
    vi.mocked(toggleMovieWatched).mockResolvedValue({ isWatched: true });
    render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark as watched" }));

    await waitFor(() => expect(toggleMovieWatched).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(toggleMovieWatched).mock.calls[0][1];
    expect(formData.get("tmdbMovieId")).toBe("550");
    expect(formData.get("isWatched")).toBe("false");
    expect(toggleShowWatched).not.toHaveBeenCalled();
  });

  it("submits tmdbShowId to toggleShowWatched for a show", async () => {
    vi.mocked(toggleShowWatched).mockResolvedValue({ isWatched: true });
    render(
      <WatchedButton tmdbId={1399} mediaType="tv" initialIsWatched={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark as watched" }));

    await waitFor(() => expect(toggleShowWatched).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(toggleShowWatched).mock.calls[0][1];
    expect(formData.get("tmdbShowId")).toBe("1399");
    expect(toggleMovieWatched).not.toHaveBeenCalled();
  });

  it("shows 'Watched' once the parent re-renders with the updated initialIsWatched", async () => {
    // The parent (a Server Component page) re-renders this with a fresh
    // initialIsWatched after toggleMovieWatched's revalidatePath resolves —
    // simulated here via rerender rather than the action's own return value.
    vi.mocked(toggleMovieWatched).mockResolvedValue({ isWatched: true });
    const { rerender } = render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark as watched" }));
    await waitFor(() => expect(toggleMovieWatched).toHaveBeenCalledTimes(1));

    rerender(<WatchedButton tmdbId={550} mediaType="movie" initialIsWatched />);

    expect(screen.getByRole("button", { name: "Watched" })).toBeInTheDocument();
  });

  it("reverts to 'Mark as watched' once the parent re-renders after unmarking an empty log", async () => {
    vi.mocked(toggleMovieWatched).mockResolvedValue({ isWatched: false });
    const { rerender } = render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Watched" }));

    await waitFor(() => {
      const formData = vi.mocked(toggleMovieWatched).mock.calls[0][1];
      expect(formData.get("isWatched")).toBe("true");
    });

    rerender(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );

    expect(
      screen.getByRole("button", { name: "Mark as watched" }),
    ).toBeInTheDocument();
  });

  it("picks up an externally created log without any click (e.g. rating a star elsewhere)", () => {
    const { rerender } = render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );
    expect(
      screen.getByRole("button", { name: "Mark as watched" }),
    ).toBeInTheDocument();

    rerender(<WatchedButton tmdbId={550} mediaType="movie" initialIsWatched />);

    expect(screen.getByRole("button", { name: "Watched" })).toBeInTheDocument();
    expect(toggleMovieWatched).not.toHaveBeenCalled();
  });

  it("stays watched and shows an error when trying to unmark a rated/reviewed log", async () => {
    vi.mocked(toggleMovieWatched).mockResolvedValue({
      isWatched: true,
      error: "This log has a rating or review — delete it from Your log below instead.",
    });
    render(<WatchedButton tmdbId={550} mediaType="movie" initialIsWatched />);

    fireEvent.click(screen.getByRole("button", { name: "Watched" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This log has a rating or review — delete it from Your log below instead.",
    );
    expect(
      screen.getByRole("button", { name: "Watched" }),
    ).toBeInTheDocument();
  });

  it("shows the error message returned by the action", async () => {
    vi.mocked(toggleMovieWatched).mockResolvedValue({
      isWatched: false,
      error: "Failed to mark this movie as watched. Please try again.",
    });
    render(
      <WatchedButton tmdbId={550} mediaType="movie" initialIsWatched={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark as watched" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to mark this movie as watched. Please try again.",
    );
  });
});
