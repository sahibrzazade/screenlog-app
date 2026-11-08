import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { DiaryTimeline } from "@/components/diary-timeline";
import { loadMoreDiary } from "@/app/diary/actions";
import { formatDayOfMonth, formatMonthHeading, formatWeekday, groupByMonth } from "@/lib/diary-dates";
import type { DiaryCursor, DiaryTimelineEntry } from "@/lib/diary-timeline";

vi.mock("@/app/diary/actions", () => ({ loadMoreDiary: vi.fn() }));

afterEach(cleanup);

const entry = (id: string, watchedDate: string, overrides: Partial<DiaryTimelineEntry> = {}): DiaryTimelineEntry => ({
  id,
  mediaType: "movie",
  title: `Title ${id}`,
  posterPath: null,
  year: "2021",
  rating: 4,
  hasReview: false,
  watchedDate,
  createdAt: `${watchedDate}T12:00:00Z`,
  href: `/movie/${id}`,
  dropped: false,
  rewatch: false,
  ...overrides,
});

const cursor: DiaryCursor = { watchedDate: "2026-10-28", createdAt: "2026-10-28T12:00:00Z", id: "c" };

describe("diary dates", () => {
  it("formats the month heading, day and weekday of the stored date", () => {
    expect(formatMonthHeading("2026-11-07")).toBe("November 2026");
    expect(formatDayOfMonth("2026-11-07")).toBe("07");
    expect(formatWeekday("2026-11-07")).toBe("Sat");
  });

  it("groups sorted entries by month, across year boundaries", () => {
    const groups = groupByMonth([
      entry("a", "2027-01-02"),
      entry("b", "2026-12-31"),
      entry("c", "2026-12-01"),
      entry("d", "2026-11-30"),
    ]);

    expect(groups.map((group) => [group.label, group.entries.map((e) => e.id)])).toEqual([
      ["January 2027", ["a"]],
      ["December 2026", ["b", "c"]],
      ["November 2026", ["d"]],
    ]);
  });

  it("returns no groups for no entries", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("DiaryTimeline", () => {
  beforeEach(() => {
    vi.mocked(loadMoreDiary).mockReset();
  });

  it("puts entries under month headings, newest first", () => {
    render(
      <DiaryTimeline
        initialEntries={[entry("a", "2026-11-07"), entry("b", "2026-10-28")]}
        initialCursor={null}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["November 2026", "October 2026"]);
    expect(within(screen.getByRole("region", { name: "November 2026" })).getByRole("link")).toHaveAttribute(
      "href",
      "/movie/a",
    );
  });

  it("shows the date on the first row of each day only", () => {
    render(
      <DiaryTimeline
        initialEntries={[entry("a", "2026-11-07"), entry("b", "2026-11-07"), entry("c", "2026-11-03")]}
        initialCursor={null}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("07Sat");
    expect(links[1]).not.toHaveTextContent("07");
    expect(links[2]).toHaveTextContent("03Tue");
  });

  it("shows type, year, stars or Watched, the review marker and the Dropped badge", () => {
    render(
      <DiaryTimeline
        initialEntries={[
          entry("m", "2026-11-07", { hasReview: true }),
          entry("s", "2026-11-06", {
            mediaType: "show",
            title: "Severance",
            year: null,
            rating: null,
            dropped: true,
            href: "/tv/95396",
          }),
          entry("n", "2026-11-05", { mediaType: "season", title: "Severance — Season 2", year: null }),
        ]}
        initialCursor={null}
      />,
    );

    const [movie, show, season] = screen.getAllByRole("link");
    expect(movie).toHaveTextContent("Movie · 2021");
    expect(within(movie).getByRole("img", { name: "4 out of 5 stars" })).toBeInTheDocument();
    expect(movie).toHaveTextContent("Has review");

    expect(show).toHaveAttribute("href", "/tv/95396");
    expect(show).toHaveTextContent("Show");
    expect(show).toHaveTextContent("Dropped");
    expect(show).toHaveTextContent("Watched");
    expect(show).not.toHaveTextContent("Has review");

    expect(season).toHaveTextContent("Severance — Season 2");
    expect(season).toHaveTextContent("Season");
  });

  it("marks rewatches only", () => {
    render(
      <DiaryTimeline
        initialEntries={[entry("again", "2026-11-07", { rewatch: true }), entry("first", "2025-03-02")]}
        initialCursor={null}
      />,
    );

    const [again, first] = screen.getAllByRole("link");
    expect(again).toHaveTextContent("Rewatch");
    expect(first).not.toHaveTextContent("Rewatch");
  });

  it("appends the next page, continuing a split month under one heading", async () => {
    vi.mocked(loadMoreDiary).mockResolvedValue({
      entries: [entry("d", "2026-10-20"), entry("e", "2026-09-30")],
      nextCursor: null,
    });
    render(<DiaryTimeline initialEntries={[entry("c", "2026-10-28")]} initialCursor={cursor} />);

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(await screen.findByRole("link", { name: /Title e/ })).toBeInTheDocument();
    expect(loadMoreDiary).toHaveBeenCalledWith(cursor);
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "October 2026",
      "September 2026",
    ]);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });

  it("shows an error and keeps the button when loading more fails", async () => {
    vi.mocked(loadMoreDiary).mockRejectedValue(new Error("network"));
    render(<DiaryTimeline initialEntries={[entry("c", "2026-10-28")]} initialCursor={cursor} />);

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load more entries.");
    expect(await screen.findByRole("button", { name: "Show more" })).toBeEnabled();
  });
});
