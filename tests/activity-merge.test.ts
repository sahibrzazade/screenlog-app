import { describe, it, expect, vi } from "vitest";
import { mergeActivity, type ActivityEvent } from "@/lib/activity";

vi.mock("@/lib/tmdb/resolve-media-card-item", () => ({ resolveMediaCardItem: vi.fn() }));

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 30, 12, 0, seconds)).toISOString();

const log = (id: string, seconds: number): ActivityEvent => ({
  kind: "log",
  key: `movie_log:${id}`,
  createdAt: at(seconds),
  userId: "u1",
  mediaType: "movie",
  tmdbId: 550,
  seasonNumber: null,
  rating: 4,
  review: null,
  rewatch: false,
});

const watchlistAdd = (id: string, seconds: number): ActivityEvent => ({
  kind: "watchlist",
  key: `watchlist:${id}`,
  createdAt: at(seconds),
  userId: "u2",
  mediaType: "tv",
  tmdbId: 1399,
});

const follow = (id: string, seconds: number): ActivityEvent => ({
  kind: "follow",
  key: `follow:${id}`,
  createdAt: at(seconds),
  userId: id,
});

const keys = (events: ActivityEvent[]) => events.map((event) => event.key);

describe("mergeActivity", () => {
  it("interleaves all sources newest-first", () => {
    const { events } = mergeActivity(
      [[log("a", 50), log("b", 10)], [watchlistAdd("c", 40)], [follow("d", 30)]],
      null,
    );
    expect(keys(events)).toEqual(["movie_log:a", "watchlist:c", "follow:d", "movie_log:b"]);
  });

  it("caps the page at the total page size, not per source", () => {
    const logs = Array.from({ length: 8 }, (_, i) => log(`l${i}`, 59 - i));
    const adds = Array.from({ length: 8 }, (_, i) => watchlistAdd(`w${i}`, 58 - i));
    const { events, nextCursor } = mergeActivity([logs, adds], null, 10);
    expect(events).toHaveLength(10);
    expect(nextCursor).not.toBeNull();
  });

  it("returns no cursor when everything fits on the page", () => {
    const { events, nextCursor } = mergeActivity([[log("a", 2), log("b", 1)]], null, 10);
    expect(events).toHaveLength(2);
    expect(nextCursor).toBeNull();
  });

  it("orders same-timestamp events by key so the order is stable", () => {
    const { events } = mergeActivity([[log("a", 5)], [watchlistAdd("b", 5)], [follow("c", 5)]], null);
    expect(keys(events)).toEqual(["watchlist:b", "movie_log:a", "follow:c"]);
  });

  it("pages through same-timestamp ties with no duplicates or gaps", () => {
    const all = [log("a", 5), log("b", 5), log("c", 5), log("d", 5), log("e", 4)];

    const first = mergeActivity([all], null, 2);
    // Simulate the DB re-returning every row at/before the cursor's millisecond.
    const second = mergeActivity([all], first.nextCursor, 2);
    const third = mergeActivity([all], second.nextCursor, 2);

    const seen = [...keys(first.events), ...keys(second.events), ...keys(third.events)];
    expect(seen).toEqual(["movie_log:d", "movie_log:c", "movie_log:b", "movie_log:a", "movie_log:e"]);
    expect(third.nextCursor).toBeNull();
  });

  it("returns an empty page when there is nothing", () => {
    expect(mergeActivity([[], [], []], null)).toEqual({ events: [], nextCursor: null });
  });
});
