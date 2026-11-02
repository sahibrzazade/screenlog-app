import { describe, it, expect } from "vitest";
import {
  activityBars,
  computeTotals,
  formatWatchTime,
  logsInPeriod,
  parseStatsPeriod,
  ratingDistribution,
  statsHref,
  statsYears,
  type Runtimes,
  type StatsLog,
} from "@/lib/stats";

const movie = (tmdbId: number, watchedDate: string, rating: number | null = null): StatsLog => ({
  kind: "movie",
  tmdbId,
  rating,
  watchedDate,
});
const season = (tmdbId: number, seasonNumber: number, watchedDate: string, rating: number | null = null): StatsLog => ({
  kind: "season",
  tmdbId,
  seasonNumber,
  rating,
  watchedDate,
});
const show = (
  tmdbId: number,
  watchedDate: string,
  status: "completed" | "dropped" = "completed",
  rating: number | null = null,
): StatsLog => ({ kind: "show", tmdbId, status, rating, watchedDate });

// Breaking Bad (1396): 3 seasons of 300 / 400 / 500 minutes. A movie of 150 minutes.
const runtimes: Runtimes = {
  movies: new Map([[1, 150]]),
  showSeasons: new Map([
    [
      1396,
      new Map([
        [1, 300],
        [2, 400],
        [3, 500],
      ]),
    ],
  ]),
};

describe("parseStatsPeriod", () => {
  it("defaults to the current year", () => {
    expect(parseStatsPeriod(undefined, 2026)).toBe(2026);
  });

  it("accepts all and four-digit years", () => {
    expect(parseStatsPeriod("all", 2026)).toBe("all");
    expect(parseStatsPeriod("2024", 2026)).toBe(2024);
    expect(parseStatsPeriod(["2023", "all"], 2026)).toBe(2023);
  });

  it("falls back to the current year for anything else", () => {
    for (const raw of ["", "ALL", "24", "20245", "abcd", "2024a"]) {
      expect(parseStatsPeriod(raw, 2026)).toBe(2026);
    }
  });
});

describe("statsHref", () => {
  it("leaves the param out for the current year", () => {
    expect(statsHref("/user/a/stats", 2026, 2026)).toBe("/user/a/stats");
  });

  it("adds year for other years and all time", () => {
    expect(statsHref("/user/a/stats", 2024, 2026)).toBe("/user/a/stats?year=2024");
    expect(statsHref("/user/a/stats", "all", 2026)).toBe("/user/a/stats?year=all");
  });
});

describe("statsYears", () => {
  it("lists the current year plus every logged year, newest first, without duplicates", () => {
    const logs = [movie(1, "2023-05-01"), season(1396, 1, "2024-02-01"), movie(1, "2024-03-01")];
    expect(statsYears(logs, 2026)).toEqual([2026, 2024, 2023]);
  });
});

describe("logsInPeriod", () => {
  it("keeps only the given year's logs, or all of them", () => {
    const logs = [movie(1, "2024-12-31"), movie(2, "2025-01-01")];
    expect(logsInPeriod(logs, 2025)).toEqual([logs[1]]);
    expect(logsInPeriod(logs, "all")).toEqual(logs);
  });
});

describe("computeTotals", () => {
  it("counts films and distinct shows (3 season logs + 1 show log of one show → 1 show)", () => {
    const logs = [
      movie(1, "2026-01-01"),
      season(1396, 1, "2026-01-01"),
      season(1396, 2, "2026-01-01"),
      season(1396, 3, "2026-01-01"),
      show(1396, "2026-02-01"),
    ];
    const totals = computeTotals(logs, runtimes);
    expect(totals.films).toBe(1);
    expect(totals.shows).toBe(1);
  });

  it("counts every season once for a completed show, even with season logs too", () => {
    const logs = [season(1396, 1, "2026-01-01"), show(1396, "2026-02-01")];
    // 300 + 400 + 500 = 1200 min = 20 h (season 1 not counted twice)
    expect(computeTotals(logs, runtimes).hours).toBe(20);
  });

  it("counts only the logged seasons when there is no show log", () => {
    const logs = [season(1396, 1, "2026-01-01"), season(1396, 2, "2026-01-01")];
    // 300 + 400 = 700 min → 11 h (rounded down)
    expect(computeTotals(logs, runtimes).hours).toBe(11);
  });

  it("counts only the logged seasons for a dropped show", () => {
    const logs = [season(1396, 1, "2026-01-01"), show(1396, "2026-02-01", "dropped")];
    expect(computeTotals(logs, runtimes).hours).toBe(5);
  });

  it("gives a dropped show with no season logs 0 hours but still 1 show", () => {
    const totals = computeTotals([show(1396, "2026-02-01", "dropped")], runtimes);
    expect(totals).toEqual({ films: 0, shows: 1, hours: 0, movieMinutes: 0, showMinutes: 0 });
  });

  it("keeps film and show minutes apart and rounds the combined hours down", () => {
    const logs = [movie(1, "2026-01-01"), season(1396, 1, "2026-01-01")];
    const totals = computeTotals(logs, runtimes);
    // 150 + 300 = 450 min = 7.5 h → 7
    expect(totals.hours).toBe(7);
    expect(totals.movieMinutes).toBe(150);
    expect(totals.showMinutes).toBe(300);
  });

  it("treats missing runtimes as 0", () => {
    const logs = [movie(999, "2026-01-01"), season(42, 1, "2026-01-01"), season(1396, 9, "2026-01-01")];
    expect(computeTotals(logs, runtimes)).toEqual({ films: 1, shows: 2, hours: 0, movieMinutes: 0, showMinutes: 0 });
  });
});

describe("formatWatchTime", () => {
  it("breaks minutes into days, hours and minutes", () => {
    expect(formatWatchTime(13 * 1440 + 4 * 60 + 47)).toBe("13 days, 4 hours and 47 minutes");
  });

  it("uses singular units and leaves zero units out", () => {
    expect(formatWatchTime(1440 + 1)).toBe("1 day and 1 minute");
    expect(formatWatchTime(60)).toBe("1 hour");
    expect(formatWatchTime(2 * 1440 + 3 * 60)).toBe("2 days and 3 hours");
    expect(formatWatchTime(5)).toBe("5 minutes");
  });

  it("says 0 minutes for nothing", () => {
    expect(formatWatchTime(0)).toBe("0 minutes");
  });
});

describe("activityBars", () => {
  it("returns 12 monthly bars for a year, keeping empty months", () => {
    const bars = activityBars([movie(1, "2026-01-15"), season(1396, 1, "2026-01-20"), show(1396, "2026-03-01")], 2026);
    expect(bars).toHaveLength(12);
    expect(bars[0]).toEqual({ label: "Jan", count: 2, films: 1, tv: 1 });
    expect(bars[1]).toEqual({ label: "Feb", count: 0, films: 0, tv: 0 });
    expect(bars[2]).toEqual({ label: "Mar", count: 1, films: 0, tv: 1 });
  });

  it("returns one bar per year for all time, oldest first, filling gaps with zero", () => {
    const bars = activityBars([movie(1, "2026-01-01"), movie(2, "2023-05-01"), season(3, 1, "2023-06-01")], "all");
    expect(bars).toEqual([
      { label: "2023", count: 2, films: 1, tv: 1 },
      { label: "2024", count: 0, films: 0, tv: 0 },
      { label: "2025", count: 0, films: 0, tv: 0 },
      { label: "2026", count: 1, films: 1, tv: 0 },
    ]);
  });

  it("returns no bars for all time with no logs", () => {
    expect(activityBars([], "all")).toEqual([]);
  });
});

describe("ratingDistribution", () => {
  it("has ten half-star bars and ignores unrated entries", () => {
    const dist = ratingDistribution([
      movie(1, "2026-01-01", 4.5),
      season(1396, 1, "2026-01-01", 4.5),
      show(1396, "2026-01-01", "completed", 0.5),
      movie(2, "2026-01-01", null),
    ]);
    expect(dist).toHaveLength(10);
    expect(dist[0]).toEqual({ rating: 0.5, count: 1, films: 0, tv: 1 });
    expect(dist[8]).toEqual({ rating: 4.5, count: 2, films: 1, tv: 1 });
    expect(dist.reduce((total, bar) => total + bar.count, 0)).toBe(3);
  });
});
