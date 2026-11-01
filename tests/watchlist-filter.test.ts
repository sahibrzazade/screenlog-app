import { describe, expect, it } from "vitest";
import {
  filterWatchlistItems,
  parseWatchlistFilter,
  watchlistHref,
} from "@/lib/watchlist-filter";

describe("parseWatchlistFilter", () => {
  it("defaults to all when the param is missing", () => {
    expect(parseWatchlistFilter(undefined)).toBe("all");
  });

  it("selects movie or tv only for the exact values", () => {
    expect(parseWatchlistFilter("movie")).toBe("movie");
    expect(parseWatchlistFilter("tv")).toBe("tv");
    expect(parseWatchlistFilter("all")).toBe("all");
    expect(parseWatchlistFilter("MOVIE")).toBe("all");
    expect(parseWatchlistFilter("shows")).toBe("all");
    expect(parseWatchlistFilter("")).toBe("all");
  });

  it("uses the first value when the param is repeated", () => {
    expect(parseWatchlistFilter(["tv", "movie"])).toBe("tv");
    expect(parseWatchlistFilter(["x", "movie"])).toBe("all");
  });
});

describe("watchlistHref", () => {
  it("returns the bare path for all", () => {
    expect(watchlistHref("/user/a/watchlist", "all")).toBe("/user/a/watchlist");
  });

  it("adds the type param for movie and tv", () => {
    expect(watchlistHref("/user/a/watchlist", "movie")).toBe("/user/a/watchlist?type=movie");
    expect(watchlistHref("/user/a/watchlist", "tv")).toBe("/user/a/watchlist?type=tv");
  });
});

describe("filterWatchlistItems", () => {
  const items = [
    { id: 1, mediaType: "movie" as const },
    { id: 2, mediaType: "tv" as const },
    { id: 3, mediaType: "movie" as const },
  ];

  it("returns every item for all", () => {
    expect(filterWatchlistItems(items, "all")).toEqual(items);
  });

  it("keeps only the selected type, in the original order", () => {
    expect(filterWatchlistItems(items, "movie").map((item) => item.id)).toEqual([1, 3]);
    expect(filterWatchlistItems(items, "tv").map((item) => item.id)).toEqual([2]);
  });
});
