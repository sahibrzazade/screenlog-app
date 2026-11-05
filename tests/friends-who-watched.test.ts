import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFriendsWhoWatched } from "@/lib/friends-who-watched";

type Result = { data: unknown };
type Tables = { follows?: Result; logs?: Result; profiles?: Result };

/** follows (select → eq), logs (select → match → in → order → order), profiles_public (select → in). */
const fakeClient = (tables: Tables) => {
  const calls = { logTable: "", columns: "", match: {} as unknown, inIds: [] as unknown, queried: [] as string[] };

  const client = {
    from: (table: string) => {
      calls.queried.push(table);
      if (table === "follows") {
        return { select: () => ({ eq: () => Promise.resolve(tables.follows ?? { data: [] }) }) };
      }
      if (table === "profiles_public") {
        return { select: () => ({ in: () => Promise.resolve(tables.profiles ?? { data: [] }) }) };
      }
      calls.logTable = table;
      const orderChain = {
        order: () => ({ order: () => Promise.resolve(tables.logs ?? { data: [] }) }),
      };
      return {
        select: (columns: string) => {
          calls.columns = columns;
          return {
            match: (match: unknown) => {
              calls.match = match;
              return {
                in: (_column: string, ids: unknown) => {
                  calls.inIds = ids;
                  return orderChain;
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, calls };
};

const follows = { data: [{ following_id: "bob" }, { following_id: "carol" }] };
const profiles = {
  data: [
    { id: "bob", username: "bob", avatar_url: "bob.png" },
    { id: "carol", username: "carol", avatar_url: null },
  ],
};

describe("getFriendsWhoWatched", () => {
  it("returns nothing for guests without querying", async () => {
    const { client, calls } = fakeClient({ follows });
    expect(await getFriendsWhoWatched(client, "movie_logs", { tmdb_movie_id: 550 }, null)).toEqual([]);
    expect(calls.queried).toEqual([]);
  });

  it("returns nothing when the viewer follows nobody, without reading logs", async () => {
    const { client, calls } = fakeClient({ follows: { data: [] } });
    expect(await getFriendsWhoWatched(client, "movie_logs", { tmdb_movie_id: 550 }, "viewer")).toEqual([]);
    expect(calls.queried).toEqual(["follows"]);
  });

  it("reads only followed users' logs of this title and keeps the query's order", async () => {
    const { client, calls } = fakeClient({
      follows,
      profiles,
      logs: { data: [{ user_id: "carol", rating: "4.5" }, { user_id: "bob", rating: null }] },
    });

    const friends = await getFriendsWhoWatched(client, "movie_logs", { tmdb_movie_id: 550 }, "viewer");

    expect(calls.logTable).toBe("movie_logs");
    expect(calls.columns).toBe("user_id, rating");
    expect(calls.match).toEqual({ tmdb_movie_id: 550 });
    expect(calls.inIds).toEqual(["bob", "carol"]);
    expect(friends).toEqual([
      { userId: "carol", username: "carol", avatarUrl: null, rating: 4.5, dropped: false },
      { userId: "bob", username: "bob", avatarUrl: "bob.png", rating: null, dropped: false },
    ]);
  });

  it("flags dropped show logs", async () => {
    const { client, calls } = fakeClient({
      follows,
      profiles,
      logs: { data: [{ user_id: "bob", rating: 3, status: "dropped" }, { user_id: "carol", rating: 5, status: "completed" }] },
    });

    const friends = await getFriendsWhoWatched(client, "show_logs", { tmdb_show_id: 1399 }, "viewer");

    expect(calls.columns).toBe("user_id, rating, status");
    expect(friends.map((friend) => [friend.username, friend.dropped])).toEqual([
      ["bob", true],
      ["carol", false],
    ]);
  });

  it("drops users without a username", async () => {
    const { client } = fakeClient({
      follows,
      profiles: { data: [{ id: "bob", username: null, avatar_url: null }] },
      logs: { data: [{ user_id: "bob", rating: 4 }] },
    });
    expect(await getFriendsWhoWatched(client, "movie_logs", { tmdb_movie_id: 550 }, "viewer")).toEqual([]);
  });

  it("comes back empty when a query fails", async () => {
    const failedFollows = fakeClient({ follows: { data: null } });
    expect(await getFriendsWhoWatched(failedFollows.client, "movie_logs", { tmdb_movie_id: 550 }, "viewer")).toEqual([]);

    const failedLogs = fakeClient({ follows, logs: { data: null } });
    expect(await getFriendsWhoWatched(failedLogs.client, "movie_logs", { tmdb_movie_id: 550 }, "viewer")).toEqual([]);
  });
});
