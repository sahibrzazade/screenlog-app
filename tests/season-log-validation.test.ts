import { describe, it, expect } from "vitest";
import { seasonLogSchema } from "@/lib/validation/season-log";

const validInput = {
  tmdbShowId: "1399",
  seasonNumber: "1",
  rating: "4.5",
  review: "",
  watchedDate: "2020-01-01",
};

describe("seasonLogSchema", () => {
  it("accepts valid input and coerces types", () => {
    const result = seasonLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        tmdbShowId: 1399,
        seasonNumber: 1,
        rating: 4.5,
        review: undefined,
        watchedDate: "2020-01-01",
      });
    }
  });

  it("accepts season 0 (specials)", () => {
    expect(seasonLogSchema.safeParse({ ...validInput, seasonNumber: "0" }).success).toBe(true);
  });

  it("rejects a negative season number", () => {
    expect(seasonLogSchema.safeParse({ ...validInput, seasonNumber: "-1" }).success).toBe(false);
  });

  it("rejects a rating that isn't a 0.5 increment", () => {
    expect(seasonLogSchema.safeParse({ ...validInput, rating: "4.3" }).success).toBe(false);
  });

  it("rejects a rating below 0.5", () => {
    expect(seasonLogSchema.safeParse({ ...validInput, rating: "0" }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(seasonLogSchema.safeParse({ ...validInput, rating: "5.5" }).success).toBe(false);
  });

  it("rejects a watched date in the future", () => {
    const result = seasonLogSchema.safeParse({ ...validInput, watchedDate: "2999-01-01" });
    expect(result.success).toBe(false);
  });

  it("keeps a non-empty review after trimming", () => {
    const result = seasonLogSchema.safeParse({ ...validInput, review: "  great season  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.review).toBe("great season");
    }
  });

  it("rejects a review over the max length", () => {
    const result = seasonLogSchema.safeParse({ ...validInput, review: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});
