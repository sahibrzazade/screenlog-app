import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWatchedTitleKeys } from "@/lib/watched-titles";

type Query = { table: string; column: string; userId: unknown; ids: unknown };

/** Each table: select → eq("user_id") → in(column, ids). */
const fakeClient = (rows: Record<string, { data: unknown }>) => {
  const queries: Query[] = [];

  const client = {
    from: (table: string) => ({
      select: (column: string) => ({
        eq: (_userColumn: string, userId: unknown) => ({
          in: (_column: string, ids: unknown) => {
            queries.push({ table, column, userId, ids });
            return Promise.resolve(rows[table] ?? { data: [] });
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  return { client, queries };
};

describe("fetchWatchedTitleKeys", () => {
  it("returns nothing for guests without querying", async () => {
    const { client, queries } = fakeClient({});
    expect(await fetchWatchedTitleKeys(client, null, [1], [2])).toEqual(new Set());
    expect(queries).toEqual([]);
  });

  it("looks up only the viewer's logs of the given titles", async () => {
    const { client, queries } = fakeClient({});
    await fetchWatchedTitleKeys(client, "viewer", [1, 2], [3]);

    expect(queries).toEqual([
      { table: "movie_logs", column: "tmdb_movie_id", userId: "viewer", ids: [1, 2] },
      { table: "show_logs", column: "tmdb_show_id", userId: "viewer", ids: [3] },
      { table: "season_logs", column: "tmdb_show_id", userId: "viewer", ids: [3] },
    ]);
  });

  it("counts a show as watched from a show log or any season log", async () => {
    const { client } = fakeClient({
      movie_logs: { data: [{ tmdb_movie_id: 1 }, { tmdb_movie_id: 1 }] },
      show_logs: { data: [{ tmdb_show_id: 3 }] },
      season_logs: { data: [{ tmdb_show_id: 4 }, { tmdb_show_id: 4 }] },
    });

    const keys = await fetchWatchedTitleKeys(client, "viewer", [1, 2], [3, 4, 5]);

    expect(keys).toEqual(new Set(["movie-1", "tv-3", "tv-4"]));
  });

  it("skips the queries for a media type with no ids", async () => {
    const { client, queries } = fakeClient({});
    await fetchWatchedTitleKeys(client, "viewer", [], [3]);
    expect(queries.map((query) => query.table)).toEqual(["show_logs", "season_logs"]);

    const second = fakeClient({});
    await fetchWatchedTitleKeys(second.client, "viewer", [1], []);
    expect(second.queries.map((query) => query.table)).toEqual(["movie_logs"]);
  });

  it("treats a failed query as nothing watched", async () => {
    const { client } = fakeClient({ movie_logs: { data: null } });
    expect(await fetchWatchedTitleKeys(client, "viewer", [1], [])).toEqual(new Set());
  });
});
