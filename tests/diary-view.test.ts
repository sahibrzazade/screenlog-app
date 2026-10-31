import { describe, expect, it } from "vitest";
import { diaryHref, parseDiaryView } from "@/lib/diary-view";

describe("parseDiaryView", () => {
  it("defaults to grid when the param is missing", () => {
    expect(parseDiaryView(undefined)).toBe("grid");
  });

  it("selects list only for the exact value", () => {
    expect(parseDiaryView("list")).toBe("list");
    expect(parseDiaryView("grid")).toBe("grid");
    expect(parseDiaryView("LIST")).toBe("grid");
    expect(parseDiaryView("")).toBe("grid");
  });

  it("uses the first value when the param is repeated", () => {
    expect(parseDiaryView(["list", "grid"])).toBe("list");
    expect(parseDiaryView(["grid", "list"])).toBe("grid");
  });
});

describe("diaryHref", () => {
  it("returns the bare path for grid view on the first page", () => {
    expect(diaryHref("/diary", { view: "grid" })).toBe("/diary");
    expect(diaryHref("/diary", { view: "grid", page: 1 })).toBe("/diary");
  });

  it("adds view=list for list view", () => {
    expect(diaryHref("/diary", { view: "list" })).toBe("/diary?view=list");
  });

  it("keeps the page alongside the view", () => {
    expect(diaryHref("/user/a/films", { view: "grid", page: 2 })).toBe("/user/a/films?page=2");
    expect(diaryHref("/user/a/films", { view: "list", page: 3 })).toBe(
      "/user/a/films?page=3&view=list",
    );
  });
});
