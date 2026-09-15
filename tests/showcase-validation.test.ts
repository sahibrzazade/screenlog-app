import { describe, it, expect } from "vitest";
import { nowWatchingIdSchema, showcaseIdsSchema } from "@/lib/validation/showcase";

describe("showcaseIdsSchema", () => {
  it("accepts up to 4 ids and coerces strings to numbers", () => {
    const result = showcaseIdsSchema.safeParse(["550", "551", 552]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([550, 551, 552]);
    }
  });

  it("accepts an empty array", () => {
    expect(showcaseIdsSchema.safeParse([]).success).toBe(true);
  });

  it("rejects a 5th id", () => {
    const result = showcaseIdsSchema.safeParse([1, 2, 3, 4, 5]);
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive id", () => {
    const result = showcaseIdsSchema.safeParse([1, 0]);
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    const result = showcaseIdsSchema.safeParse([1.5]);
    expect(result.success).toBe(false);
  });
});

describe("nowWatchingIdSchema", () => {
  it("accepts a positive id and coerces from string", () => {
    const result = nowWatchingIdSchema.safeParse("1399");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(1399);
    }
  });

  it("accepts null (clearing the value)", () => {
    const result = nowWatchingIdSchema.safeParse(null);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("rejects a non-positive id", () => {
    expect(nowWatchingIdSchema.safeParse("0").success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(nowWatchingIdSchema.safeParse("1.5").success).toBe(false);
  });
});
