import { describe, it, expect, vi, beforeEach } from "vitest";
import { tmdbFetch } from "@/lib/tmdb/client";
import { airedSeasonMinutes, getRuntimes } from "@/lib/stats-data";
import type { TmdbSeasonDetails } from "@/lib/tmdb/types";

vi.mock("@/lib/tmdb/client", () => ({ tmdbFetch: vi.fn() }));
vi.mock("@/lib/date", () => ({ todayIso: () => "2026-06-01" }));

const episode = (air_date: string | null, runtime: number | null) =>
  ({ id: 1, episode_number: 1, name: "", overview: "", air_date, runtime, still_path: null, vote_average: 0, vote_count: 0 });

const seasonDetails = (episodes: ReturnType<typeof episode>[]): TmdbSeasonDetails => ({
  id: 1,
  season_number: 1,
  name: "",
  overview: "",
  poster_path: null,
  air_date: null,
  episodes,
});

describe("airedSeasonMinutes", () => {
  it("sums aired episodes, skipping unaired / undated ones and counting missing runtimes as 0", () => {
    const season = seasonDetails([
      episode("2026-01-01", 50),
      episode("2026-06-01", 40),
      episode("2026-06-02", 60), // airs after today
      episode(null, 30), // no air date
      episode("2026-02-01", null), // unknown runtime
    ]);
    expect(airedSeasonMinutes(season, "2026-06-01")).toBe(90);
  });
});

describe("getRuntimes", () => {
  // Braces matter: returning the mock would make Vitest run it as a cleanup hook.
  beforeEach(() => {
    vi.mocked(tmdbFetch).mockReset();
  });

  it("resolves movie runtimes and per-season minutes, skipping specials", async () => {
    vi.mocked(tmdbFetch).mockImplementation(async (path: string, params?: Record<string, string>) => {
      if (path === "/movie/1") return { runtime: 120 };
      if (path === "/tv/7" && !params) {
        return { seasons: [{ season_number: 0 }, { season_number: 1 }, { season_number: 2 }] };
      }
      if (path === "/tv/7" && params) {
        expect(params.append_to_response).toBe("season/1,season/2");
        return {
          "season/1": seasonDetails([episode("2020-01-01", 45), episode("2020-01-08", 45)]),
          "season/2": seasonDetails([episode("2021-01-01", 60)]),
        };
      }
      throw new Error(`unexpected ${path}`);
    });

    const runtimes = await getRuntimes([
      { kind: "movie", tmdbId: 1, rating: null, watchedDate: "2026-01-01" },
      { kind: "show", tmdbId: 7, status: "completed", rating: null, watchedDate: "2026-01-01" },
    ]);

    expect(runtimes.movies.get(1)).toBe(120);
    expect([...runtimes.showSeasons.get(7)!.entries()]).toEqual([
      [1, 90],
      [2, 60],
    ]);
  });

  it("batches more than 20 seasons into several requests", async () => {
    const seasons = Array.from({ length: 25 }, (_, i) => ({ season_number: i + 1 }));
    vi.mocked(tmdbFetch).mockImplementation(async (_path: string, params?: Record<string, string>) => {
      if (!params) return { seasons };
      return Object.fromEntries(
        params.append_to_response.split(",").map((key) => [key, seasonDetails([episode("2020-01-01", 10)])]),
      );
    });

    const runtimes = await getRuntimes([
      { kind: "season", tmdbId: 9, seasonNumber: 1, rating: null, watchedDate: "2026-01-01" },
    ]);

    const appendCalls = vi.mocked(tmdbFetch).mock.calls.filter(([, params]) => params);
    expect(appendCalls.map(([, params]) => params!.append_to_response.split(",").length)).toEqual([20, 5]);
    expect(runtimes.showSeasons.get(9)!.size).toBe(25);
  });

  it("drops a title whose TMDB lookup fails instead of throwing", async () => {
    vi.mocked(tmdbFetch).mockRejectedValue(new Error("TMDB down"));
    const runtimes = await getRuntimes([{ kind: "movie", tmdbId: 1, rating: null, watchedDate: "2026-01-01" }]);
    expect(runtimes.movies.size).toBe(0);
  });
});
