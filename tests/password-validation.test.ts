import { describe, it, expect } from "vitest";
import { changePasswordSchema } from "@/lib/validation/password";

describe("changePasswordSchema", () => {
  it("accepts a valid current + new password with a matching confirmation", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password-123",
      confirmNewPassword: "new-password-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "new-password-123",
      confirmNewPassword: "new-password-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a new password under 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "short1",
      confirmNewPassword: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a new password exactly 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "12345678",
      confirmNewPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a confirmation that doesn't match the new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "new-password-123",
      confirmNewPassword: "something-else",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords don't match.");
      expect(result.error.issues[0].path).toEqual(["confirmNewPassword"]);
    }
  });
});
