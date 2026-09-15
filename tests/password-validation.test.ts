import { describe, it, expect } from "vitest";
import { changePasswordSchema } from "@/lib/validation/password";

describe("changePasswordSchema", () => {
  it("accepts a valid current + new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "new-password-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a new password under 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a new password exactly 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });
});
