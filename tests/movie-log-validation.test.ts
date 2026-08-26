import { describe, it, expect } from "vitest";
import { movieLogSchema } from "@/lib/validation/movie-log";

const validInput = {
  tmdbMovieId: "603",
  review: "",
  watchedDate: "2020-01-01",
};

describe("movieLogSchema", () => {
  it("accepts valid input and coerces types", () => {
    const result = movieLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        tmdbMovieId: 603,
        review: undefined,
        watchedDate: "2020-01-01",
      });
    }
  });

  it("rejects a watched date in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = movieLogSchema.safeParse({
      ...validInput,
      watchedDate: future.toISOString().slice(0, 10),
    });
    expect(result.success).toBe(false);
  });

  it("keeps a non-empty review after trimming", () => {
    const result = movieLogSchema.safeParse({ ...validInput, review: "  great movie  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.review).toBe("great movie");
    }
  });

  it("rejects a review over the max length", () => {
    const result = movieLogSchema.safeParse({ ...validInput, review: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});
