import { describe, it, expect } from "vitest";
import { watchlistToggleSchema } from "@/lib/validation/watchlist";

describe("watchlistToggleSchema", () => {
  it("accepts valid input and coerces types", () => {
    const result = watchlistToggleSchema.safeParse({
      tmdbId: "550",
      mediaType: "movie",
      inWatchlist: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        tmdbId: 550,
        mediaType: "movie",
        inWatchlist: false,
      });
    }
  });

  it("rejects a mediaType outside movie/tv", () => {
    const result = watchlistToggleSchema.safeParse({
      tmdbId: "550",
      mediaType: "book",
      inWatchlist: "false",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive tmdbId", () => {
    const result = watchlistToggleSchema.safeParse({
      tmdbId: "0",
      mediaType: "tv",
      inWatchlist: "true",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an inWatchlist value that isn't 'true' or 'false'", () => {
    const result = watchlistToggleSchema.safeParse({
      tmdbId: "550",
      mediaType: "tv",
      inWatchlist: "yes",
    });
    expect(result.success).toBe(false);
  });
});
