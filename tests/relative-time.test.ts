import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/date";

const NOW = new Date("2026-10-30T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("formatRelativeTime", () => {
  it("says 'just now' under a minute", () => {
    expect(formatRelativeTime(ago(30_000), NOW)).toBe("just now");
  });

  it("uses minutes, hours, then days", () => {
    expect(formatRelativeTime(ago(5 * 60_000), NOW)).toBe("5m ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), NOW)).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * 86_400_000), NOW)).toBe("2d ago");
  });

  it("falls back to a date after a week, adding the year only when it differs", () => {
    expect(formatRelativeTime("2026-10-12T12:00:00Z", NOW)).toBe("12 Oct");
    expect(formatRelativeTime("2025-10-12T12:00:00Z", NOW)).toBe("12 Oct 2025");
  });
});
