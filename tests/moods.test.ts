import { describe, it, expect } from "vitest";
import { MOODS, getMoodById } from "@/lib/tmdb/moods";

describe("MOODS", () => {
  it("has exactly 3 moods, each with non-empty genre mappings", () => {
    expect(MOODS).toHaveLength(3);
    for (const mood of MOODS) {
      expect(mood.id).toBeTruthy();
      expect(mood.emoji).toBeTruthy();
      expect(mood.label).toBeTruthy();
      expect(mood.movieGenres.length).toBeGreaterThan(0);
      expect(mood.tvGenres.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    const ids = MOODS.map((mood) => mood.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getMoodById", () => {
  it("returns the matching mood", () => {
    expect(getMoodById("adventure").label).toBe("an escape");
  });

  it("throws for an unknown id", () => {
    // @ts-expect-error - deliberately invalid for the test
    expect(() => getMoodById("not-a-mood")).toThrow();
  });
});
