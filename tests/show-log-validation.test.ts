import { describe, it, expect } from "vitest";
import { showLogSchema } from "@/lib/validation/show-log";

const validInput = {
  tmdbShowId: "1399",
  rating: "4.5",
  review: "",
};

describe("showLogSchema", () => {
  it("accepts valid input and coerces types", () => {
    const result = showLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        tmdbShowId: 1399,
        rating: 4.5,
        review: undefined,
      });
    }
  });

  it("rejects a rating that isn't a 0.5 increment", () => {
    expect(showLogSchema.safeParse({ ...validInput, rating: "4.3" }).success).toBe(false);
  });

  it("rejects a rating below 0.5", () => {
    expect(showLogSchema.safeParse({ ...validInput, rating: "0" }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(showLogSchema.safeParse({ ...validInput, rating: "5.5" }).success).toBe(false);
  });

  it("keeps a non-empty review after trimming", () => {
    const result = showLogSchema.safeParse({ ...validInput, review: "  great show  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.review).toBe("great show");
    }
  });

  it("rejects a review over the max length", () => {
    const result = showLogSchema.safeParse({ ...validInput, review: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });
});
