import { describe, it, expect } from "vitest";
import { formatPersonLife } from "@/lib/tmdb/person-life";

describe("formatPersonLife", () => {
  it("shows birth date and place", () => {
    expect(formatPersonLife("1963-12-18", null, "Shawnee, Oklahoma, USA")).toEqual({
      born: "Born 18 Dec 1963 · Shawnee, Oklahoma, USA",
      died: null,
    });
  });

  it("shows only what TMDB has for birth", () => {
    expect(formatPersonLife("1963-12-18", null, null).born).toBe("Born 18 Dec 1963");
    expect(formatPersonLife(null, null, "Paris, France").born).toBe("Born in Paris, France");
    expect(formatPersonLife(null, null, "  ").born).toBeNull();
  });

  it("shows the death date with the age at death", () => {
    expect(formatPersonLife("1936-01-03", "2020-01-02", null).died).toBe("Died 2 Jan 2020, aged 83");
    expect(formatPersonLife("1936-01-03", "2020-01-03", null).died).toBe("Died 3 Jan 2020, aged 84");
  });

  it("leaves the age out when the birth date is unknown", () => {
    expect(formatPersonLife(null, "2020-01-03", null).died).toBe("Died 3 Jan 2020");
  });

  it("ignores empty or malformed dates", () => {
    expect(formatPersonLife("", "not-a-date", null)).toEqual({ born: null, died: null });
  });
});
