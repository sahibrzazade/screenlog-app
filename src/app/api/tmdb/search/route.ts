import type { NextRequest } from "next/server";
import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

export const GET = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams.get("q");
  const type = request.nextUrl.searchParams.get("type");

  if (!query) {
    return Response.json({ error: "Missing required query param: q" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return Response.json({ error: "type must be 'movie' or 'tv'" }, { status: 400 });
  }

  try {
    const data = await tmdbFetch<TmdbSearchResponse>(`/search/${type}`, { query });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch search results from TMDB" }, { status: 502 });
  }
};
