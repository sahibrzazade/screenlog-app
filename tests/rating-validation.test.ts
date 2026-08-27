import { describe, it, expect } from "vitest";
import { ratingSchema } from "@/lib/validation/rating";

describe("ratingSchema", () => {
  it("accepts a valid half-star increment", () => {
    const result = ratingSchema.safeParse("3.5");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(3.5);
    }
  });

  it("rejects a rating that isn't a 0.5 increment", () => {
    expect(ratingSchema.safeParse("3.3").success).toBe(false);
  });

  it("rejects a rating below 0.5", () => {
    expect(ratingSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(ratingSchema.safeParse("5.5").success).toBe(false);
  });
});
