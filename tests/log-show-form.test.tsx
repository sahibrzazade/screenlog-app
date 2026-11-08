import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LogShowForm } from "@/components/log-show-form";

vi.mock("@/app/tv/[id]/actions", () => ({
  logShow: vi.fn(),
  deleteShowLog: vi.fn(),
  setShowRating: vi.fn(),
  clearShowLogField: vi.fn(),
  toggleShowWatched: vi.fn(),
  toggleSeasonWatched: vi.fn(),
}));

vi.mock("@/app/movie/[id]/actions", () => ({
  toggleMovieWatched: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

const log = (status: "completed" | "dropped") => ({
  id: "0b6f2c1e-6a1d-4c2b-9d6e-2f4a8b1c3d5e",
  rating: null,
  review: null,
  watchedDate: "2026-01-01",
  status,
});

describe("LogShowForm dropped checkbox", () => {
  it("is unchecked with a 'Date finished' label for a completed show", () => {
    render(<LogShowForm tmdbShowId={1399} title="Show" posterUrl={null} initialLog={log("completed")} />);
    expect(screen.getByLabelText("I dropped this show")).not.toBeChecked();
    expect(screen.getByLabelText("Date finished")).toBeInTheDocument();
  });

  it("is checked with a 'Date dropped' label for a dropped show", () => {
    render(<LogShowForm tmdbShowId={1399} title="Show" posterUrl={null} initialLog={log("dropped")} />);
    expect(screen.getByLabelText("I dropped this show")).toBeChecked();
    expect(screen.getByLabelText("Date dropped")).toBeInTheDocument();
  });

  it("relabels the date field as soon as the box is ticked, before saving", () => {
    render(<LogShowForm tmdbShowId={1399} title="Show" posterUrl={null} initialLog={null} />);
    fireEvent.click(screen.getByLabelText("I dropped this show"));
    expect(screen.getByLabelText("Date dropped")).toBeInTheDocument();
  });
});
