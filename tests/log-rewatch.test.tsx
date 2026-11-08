import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { LogMovieForm } from "@/components/log-movie-form";
import { LogShowForm } from "@/components/log-show-form";
import { setMovieRating } from "@/app/movie/[id]/actions";
import type { OwnWatch } from "@/lib/logs/queries";

vi.mock("@/app/movie/[id]/actions", () => ({
  logMovie: vi.fn(async () => undefined),
  deleteMovieLog: vi.fn(async () => undefined),
  setMovieRating: vi.fn(async (state: unknown) => state),
  clearMovieLogField: vi.fn(async () => undefined),
  toggleMovieWatched: vi.fn(),
}));

vi.mock("@/app/tv/[id]/actions", () => ({
  logShow: vi.fn(),
  deleteShowLog: vi.fn(),
  setShowRating: vi.fn(),
  clearShowLogField: vi.fn(),
  toggleShowWatched: vi.fn(),
  toggleSeasonWatched: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeAll(() => {
  // jsdom doesn't implement the modal dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

beforeEach(() => vi.mocked(setMovieRating).mockClear());
afterEach(cleanup);

const LATEST = "0b6f2c1e-6a1d-4c2b-9d6e-2f4a8b1c3d5e";
const FIRST = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const latest: OwnWatch = { id: LATEST, rating: 4, review: "Even better", watchedDate: "2026-11-07", rewatch: true };
const first: OwnWatch = { id: FIRST, rating: null, review: null, watchedDate: "2025-03-02", rewatch: false };

const renderMovie = (watches: OwnWatch[]) =>
  render(<LogMovieForm tmdbMovieId={438631} title="Dune" posterUrl={null} watches={watches} />);

const modal = () => screen.getByRole("dialog");
const hiddenValue = (name: string) =>
  (modal().querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement | null)?.value ?? null;

describe("Log again", () => {
  it("shows only once a movie has a log, and never for shows", () => {
    const { unmount } = renderMovie([]);
    expect(screen.queryByRole("button", { name: "Log again" })).not.toBeInTheDocument();
    unmount();

    renderMovie([first]);
    expect(screen.getByRole("button", { name: "Log again" })).toBeInTheDocument();
    cleanup();

    render(
      <LogShowForm
        tmdbShowId={1399}
        title="Show"
        posterUrl={null}
        initialLog={{ id: LATEST, rating: null, review: null, watchedDate: "2026-01-01", status: "completed" }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Log again" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("I've watched this before")).not.toBeInTheDocument();
  });

  it("opens an empty new watch, marked as a rewatch, that sends its rating with the form", () => {
    renderMovie([latest]);

    fireEvent.click(screen.getByRole("button", { name: "Log again" }));

    expect(within(modal()).getByText("New watch")).toBeInTheDocument();
    expect(within(modal()).getByLabelText("I've watched this before")).toBeChecked();
    expect(within(modal()).getByLabelText("Review (optional)")).toHaveValue("");
    expect(hiddenValue("newWatch")).toBe("1");
    expect(hiddenValue("logId")).toBeNull();

    fireEvent.click(within(modal()).getByLabelText("Rate 3.5 out of 5 stars"));

    expect(setMovieRating).not.toHaveBeenCalled();
    expect(hiddenValue("rating")).toBe("3.5");
  });

  it("names the edited watch's date even when it's the only one", () => {
    renderMovie([latest]);

    fireEvent.click(screen.getByRole("button", { name: "Edit review" }));

    expect(within(modal()).getByText("Watched 7 Nov 2026")).toBeInTheDocument();
    expect(within(modal()).queryByText("New watch")).not.toBeInTheDocument();
  });

  it("leaves the box unticked on a first log", () => {
    renderMovie([]);

    fireEvent.click(screen.getByRole("button", { name: "Rate & review" }));

    expect(within(modal()).getByLabelText("I've watched this before")).not.toBeChecked();
    expect(hiddenValue("newWatch")).toBeNull();
  });
});

describe("Watched N times", () => {
  it("appears from two watches and hides the card's ambiguous Delete", () => {
    const { unmount } = renderMovie([first]);
    expect(screen.queryByRole("button", { name: /Watched \d times/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    unmount();

    renderMovie([latest, first]);
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Watched 2 times" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const rows = screen.getAllByRole("button", { name: /^Edit watch of/ });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("7 Nov 2026"),
      expect.stringContaining("2 Mar 2025"),
    ]);
    expect(rows[0]).toHaveTextContent("Rewatch");
    expect(rows[1]).toHaveTextContent("Watched");
  });

  it("opens an earlier watch for editing, rating that watch and not the card's", () => {
    renderMovie([latest, first]);
    fireEvent.click(screen.getByRole("button", { name: "Watched 2 times" }));

    fireEvent.click(screen.getByRole("button", { name: /2 Mar 2025/ }));

    expect(within(modal()).getByText("Watched 2 Mar 2025")).toBeInTheDocument();
    expect(hiddenValue("logId")).toBe(FIRST);
    expect(within(modal()).getByLabelText("I've watched this before")).not.toBeChecked();
    expect(within(modal()).getByRole("button", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(within(modal()).getByLabelText("Rate 2 out of 5 stars"));

    const sent = vi.mocked(setMovieRating).mock.calls[0][1] as FormData;
    expect(sent.get("logId")).toBe(FIRST);
    expect(sent.get("rating")).toBe("2");
    expect(screen.getAllByRole("img", { name: "4 out of 5 stars" }).length).toBeGreaterThan(0);
  });

  it("names the watch in the delete confirmation", () => {
    renderMovie([latest, first]);
    fireEvent.click(screen.getByRole("button", { name: "Watched 2 times" }));
    fireEvent.click(screen.getByRole("button", { name: /2 Mar 2025/ }));

    fireEvent.click(within(modal()).getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Delete this watch?")).toBeInTheDocument();
    expect(screen.getByText(/Your watch of 2 Mar 2025/)).toBeInTheDocument();
  });
});
