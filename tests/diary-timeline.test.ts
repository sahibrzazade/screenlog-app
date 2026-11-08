import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiaryCount, getDiaryPage, mergeDiaryLogs, type DiaryCursor } from "@/lib/diary-timeline";

vi.mock("@/lib/tmdb/client", () => ({
  tmdbFetch: vi.fn(async (path: string) => {
    if (path === "/movie/404") throw new Error("not found");
    if (path.startsWith("/movie/")) return { title: "Dune", poster_path: "/dune.jpg", release_date: "2021-09-15" };
    return { name: "Severance", poster_path: "/sev.jpg", seasons: [{ season_number: 2, name: "Season 2" }] };
  }),
}));

const log = (id: string, watchedDate: string, createdAt = `${watchedDate}T12:00:00Z`): DiaryCursor => ({
  id,
  watchedDate,
  createdAt,
});

describe("mergeDiaryLogs", () => {
  it("orders by watch date, then creation time, then id, across tables", () => {
    const { logs } = mergeDiaryLogs(
      [
        [log("a", "2026-11-01"), log("b", "2026-10-01")],
        [log("c", "2026-11-01", "2026-11-02T09:00:00Z"), log("d", "2026-10-15")],
        [log("e", "2026-11-01"), log("f", "2026-11-03")],
      ],
      null,
    );

    expect(logs.map((entry) => entry.id)).toEqual(["f", "c", "e", "a", "d", "b"]);
  });

  it("returns a cursor only while more logs remain", () => {
    const batches = [[log("a", "2026-11-03"), log("b", "2026-11-02"), log("c", "2026-11-01")]];

    expect(mergeDiaryLogs(batches, null, 2).nextCursor).toEqual(log("b", "2026-11-02"));
    expect(mergeDiaryLogs(batches, null, 3).nextCursor).toBeNull();
  });

  it("drops logs already shown, keeping same-time ties that sort after the cursor", () => {
    const sameTime = "2026-11-01T12:00:00.000Z";
    const { logs } = mergeDiaryLogs(
      [[log("z", "2026-11-01", sameTime), log("m", "2026-11-01", sameTime), log("a", "2026-11-01", sameTime)]],
      log("m", "2026-11-01", sameTime),
    );

    expect(logs.map((entry) => entry.id)).toEqual(["a"]);
  });
});

type Call = { table: string; or?: string };

/**
 * Stand-in for supabase-js's query builder: every method chains, and awaiting
 * the query resolves to the table's rows. Records each table's `or` filter.
 */
const fakeSupabase = (rowsByTable: Record<string, unknown[]>, calls: Call[] = []) =>
  ({
    from: (table: string) => {
      const call: Call = { table };
      calls.push(call);
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        or: (filter: string) => {
          call.or = filter;
          return query;
        },
        then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data: rowsByTable[table] ?? [] }),
      };
      return query;
    },
  }) as unknown as SupabaseClient;

const row = (id: string, watchedDate: string) => ({
  id,
  rating: null,
  review: null,
  watched_date: watchedDate,
  created_at: `${watchedDate}T12:00:00Z`,
});

describe("getDiaryPage", () => {
  it("mixes the three tables into entries with links, type data and markers", async () => {
    const { entries, nextCursor } = await getDiaryPage(
      fakeSupabase({
        movie_logs: [{ ...row("m", "2026-11-03"), tmdb_movie_id: 438631, rating: "4.5", review: "Great" }],
        show_logs: [{ ...row("s", "2026-11-02"), tmdb_show_id: 95396, status: "dropped" }],
        season_logs: [{ ...row("n", "2026-11-01"), tmdb_show_id: 95396, season_number: 2, review: "  " }],
      }),
      "user",
    );

    expect(nextCursor).toBeNull();
    expect(entries).toMatchObject([
      { id: "m", mediaType: "movie", title: "Dune", year: "2021", rating: 4.5, hasReview: true, href: "/movie/438631", dropped: false },
      { id: "s", mediaType: "show", title: "Severance", year: null, dropped: true, href: "/tv/95396" },
      { id: "n", mediaType: "season", title: "Severance — Season 2", hasReview: false, href: "/tv/95396/season/2" },
    ]);
  });

  it("leaves out a title TMDB can't resolve", async () => {
    const { entries } = await getDiaryPage(
      fakeSupabase({
        movie_logs: [
          { ...row("gone", "2026-11-02"), tmdb_movie_id: 404 },
          { ...row("ok", "2026-11-01"), tmdb_movie_id: 1 },
        ],
      }),
      "user",
    );

    expect(entries.map((entry) => entry.id)).toEqual(["ok"]);
  });

  it("filters every table to logs at or before the cursor", async () => {
    const calls: Call[] = [];
    await getDiaryPage(fakeSupabase({}, calls), "user", log("x", "2026-10-31", "2026-10-31T08:00:00.000Z"));

    expect(calls.map((call) => call.table)).toEqual(["movie_logs", "show_logs", "season_logs"]);
    for (const call of calls) {
      expect(call.or).toBe(
        "watched_date.lt.2026-10-31,and(watched_date.eq.2026-10-31,created_at.lt.2026-10-31T08:00:00.001Z)",
      );
    }
  });
});

describe("getDiaryCount", () => {
  it("adds up the three tables", async () => {
    const counts: Record<string, number | null> = { movie_logs: 3, show_logs: null, season_logs: 2 };
    const supabase = {
      from: (table: string) => ({ select: () => ({ eq: async () => ({ count: counts[table] }) }) }),
    } as unknown as SupabaseClient;

    expect(await getDiaryCount(supabase, "user")).toBe(5);
  });
});
