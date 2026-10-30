import { describe, it, expect } from "vitest";
import { followToggleSchema } from "@/lib/validation/follow";

const VALID_UUID = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

describe("followToggleSchema", () => {
  it("accepts valid input and coerces the following flag", () => {
    const result = followToggleSchema.safeParse({
      targetUserId: VALID_UUID,
      following: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ targetUserId: VALID_UUID, following: false });
    }
  });

  it("rejects a targetUserId that isn't a uuid", () => {
    const result = followToggleSchema.safeParse({
      targetUserId: "not-a-uuid",
      following: "false",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a following value that isn't 'true' or 'false'", () => {
    const result = followToggleSchema.safeParse({
      targetUserId: VALID_UUID,
      following: "yes",
    });
    expect(result.success).toBe(false);
  });
});
