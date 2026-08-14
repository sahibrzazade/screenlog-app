import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/tmdb/search", () => {
  it("returns 400 when q is missing", async () => {
    const { GET } = await import("@/app/api/tmdb/search/route");
    const response = await GET(new NextRequest("http://localhost/api/tmdb/search?type=movie"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when type is missing or invalid", async () => {
    const { GET } = await import("@/app/api/tmdb/search/route");
    const response = await GET(new NextRequest("http://localhost/api/tmdb/search?q=matrix&type=book"));
    expect(response.status).toBe(400);
  });

  it("proxies TMDB search results", async () => {
    const mockResponse = {
      page: 1,
      results: [{ id: 603, title: "The Matrix", poster_path: null, overview: "" }],
      total_pages: 1,
      total_results: 1,
    };
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const { GET } = await import("@/app/api/tmdb/search/route");
    const response = await GET(
      new NextRequest("http://localhost/api/tmdb/search?q=matrix&type=movie"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockResponse);
  });

  it("returns 502 when TMDB request fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 500 }));

    const { GET } = await import("@/app/api/tmdb/search/route");
    const response = await GET(
      new NextRequest("http://localhost/api/tmdb/search?q=matrix&type=movie"),
    );

    expect(response.status).toBe(502);
  });
});

describe("GET /api/tmdb/movie/[id]", () => {
  it("proxies TMDB movie details", async () => {
    const mockResponse = { id: 603, title: "The Matrix", overview: "", poster_path: null };
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const { GET } = await import("@/app/api/tmdb/movie/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/tmdb/movie/603"), {
      params: Promise.resolve({ id: "603" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockResponse);
  });
});

describe("GET /api/tmdb/tv/[id]", () => {
  it("proxies TMDB show details", async () => {
    const mockResponse = { id: 1399, name: "Game of Thrones", seasons: [] };
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const { GET } = await import("@/app/api/tmdb/tv/[id]/route");
    const response = await GET(new NextRequest("http://localhost/api/tmdb/tv/1399"), {
      params: Promise.resolve({ id: "1399" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockResponse);
  });
});
