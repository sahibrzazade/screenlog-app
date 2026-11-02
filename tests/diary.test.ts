import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiaryData, sortDiaryEntries, type DiaryEntry } from "@/lib/diary";

vi.mock("@/lib/tmdb/client", () => ({
  tmdbFetch: vi.fn(async (path: string) =>
    path.startsWith("/movie/")
      ? { title: "Movie", poster_path: null }
      : { name: "Breaking Bad", poster_path: null, seasons: [{ season_number: 2, name: "Season 2" }] },
  ),
}));

/** Minimal stand-in for `from(table).select().eq().order()` returning fixed rows per table. */
const fakeSupabase = (rowsByTable: Record<string, unknown[]>) =>
  ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: rowsByTable[table] ?? [] }),
        }),
      }),
    }),
  }) as unknown as SupabaseClient;

const logRow = { rating: 4, review: null, watched_date: "2026-01-01", created_at: "2026-01-01T00:00:00Z" };

describe("getDiaryData links", () => {
  it("links a season entry to its season page and a show entry to the show page", async () => {
    const { shows } = await getDiaryData(
      fakeSupabase({
        season_logs: [{ ...logRow, id: "s", tmdb_show_id: 1396, season_number: 2 }],
        show_logs: [{ ...logRow, id: "w", tmdb_show_id: 1396, status: "completed" }],
      }),
      "user",
    );

    expect(shows.find((e) => e.id === "s")?.href).toBe("/tv/1396/season/2");
    expect(shows.find((e) => e.id === "w")?.href).toBe("/tv/1396");
  });
});

const entry = (overrides: Partial<DiaryEntry>): DiaryEntry => ({
  id: "id",
  mediaType: "movie",
  title: "Title",
  posterPath: null,
  rating: 4,
  review: null,
  watchedDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00Z",
  href: "/movie/1",
  ...overrides,
});

describe("sortDiaryEntries", () => {
  it("sorts entries by watchedDate descending", () => {
    const entries = [
      entry({ id: "a", watchedDate: "2020-01-01" }),
      entry({ id: "b", watchedDate: "2022-06-15" }),
      entry({ id: "c", watchedDate: "2021-03-10" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("merges movie and season entries into one chronological list", () => {
    const entries = [
      entry({ id: "movie", mediaType: "movie", watchedDate: "2020-05-01" }),
      entry({ id: "season", mediaType: "season", watchedDate: "2020-06-01" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["season", "movie"]);
  });

  it("merges season and show entries into one chronological list", () => {
    const entries = [
      entry({ id: "season", mediaType: "season", watchedDate: "2020-05-01" }),
      entry({ id: "show", mediaType: "show", watchedDate: "2020-06-01" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["show", "season"]);
  });

  it("breaks watchedDate ties with createdAt descending", () => {
    const entries = [
      entry({ id: "earlier", watchedDate: "2020-01-01", createdAt: "2020-01-01T10:00:00Z" }),
      entry({ id: "later", watchedDate: "2020-01-01", createdAt: "2020-01-01T12:00:00Z" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["later", "earlier"]);
  });

  it("does not mutate the input array", () => {
    const entries = [
      entry({ id: "a", watchedDate: "2020-01-01" }),
      entry({ id: "b", watchedDate: "2022-06-15" }),
    ];
    const original = [...entries];

    sortDiaryEntries(entries);

    expect(entries).toEqual(original);
  });
});
