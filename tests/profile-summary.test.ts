import { describe, expect, it } from "vitest";
import { PROFILE_SECTION_LIMIT, toProfileSection } from "@/lib/profile";

describe("toProfileSection", () => {
  it("keeps all items and reports the true total when under the limit", () => {
    const section = toProfileSection([1, 2, 3]);

    expect(section.items).toEqual([1, 2, 3]);
    expect(section.total).toBe(3);
  });

  it("truncates items to the section limit while reporting the true total", () => {
    const all = Array.from({ length: 10 }, (_, i) => i);

    const section = toProfileSection(all);

    expect(section.items).toEqual(all.slice(0, PROFILE_SECTION_LIMIT));
    expect(section.items).toHaveLength(PROFILE_SECTION_LIMIT);
    expect(section.total).toBe(10);
  });

  it("returns an empty section for an empty input", () => {
    const section = toProfileSection([]);

    expect(section.items).toEqual([]);
    expect(section.total).toBe(0);
  });
});
