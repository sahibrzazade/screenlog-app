import { describe, it, expect } from "vitest";
import { usernameSchema } from "@/lib/validation/username";

describe("usernameSchema", () => {
  it("accepts a valid username", () => {
    const result = usernameSchema.safeParse({ username: "example" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("example");
    }
  });

  it("trims surrounding whitespace", () => {
    const result = usernameSchema.safeParse({ username: "  example  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("example");
    }
  });

  it("rejects a username shorter than 3 characters", () => {
    expect(usernameSchema.safeParse({ username: "ab" }).success).toBe(false);
  });

  it("rejects a username longer than 20 characters", () => {
    expect(
      usernameSchema.safeParse({ username: "a".repeat(21) }).success,
    ).toBe(false);
  });

  it("rejects spaces and symbols", () => {
    expect(usernameSchema.safeParse({ username: "example user" }).success).toBe(
      false,
    );
    expect(usernameSchema.safeParse({ username: "example@dev" }).success).toBe(
      false,
    );
  });

  it("accepts letters, numbers, and underscores", () => {
    expect(usernameSchema.safeParse({ username: "Example_123" }).success).toBe(
      true,
    );
  });
});
