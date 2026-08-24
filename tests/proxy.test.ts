import { describe, it, expect } from "vitest";
import { isPublicRoute } from "@/lib/supabase/proxy";

describe("isPublicRoute", () => {
  it("treats the search page as public", () => {
    expect(isPublicRoute("/search")).toBe(true);
  });

  it("treats dynamic movie detail routes as public", () => {
    expect(isPublicRoute("/movie/550")).toBe(true);
  });

  it("treats dynamic tv detail routes as public", () => {
    expect(isPublicRoute("/tv/1399")).toBe(true);
  });

  it("keeps the watchlist route protected", () => {
    expect(isPublicRoute("/watchlist")).toBe(false);
  });

  it("keeps the diary route protected", () => {
    expect(isPublicRoute("/diary")).toBe(false);
  });

  it("keeps the settings route protected", () => {
    expect(isPublicRoute("/settings")).toBe(false);
  });

  it("keeps the choose-username route protected", () => {
    expect(isPublicRoute("/choose-username")).toBe(false);
  });

  it("does not treat unrelated routes with a similar prefix as public", () => {
    expect(isPublicRoute("/movies-editor")).toBe(false);
  });
});
