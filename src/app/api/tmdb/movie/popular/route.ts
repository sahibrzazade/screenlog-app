import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

export const GET = async () => {
  try {
    const data = await tmdbFetch<TmdbSearchResponse>("/movie/popular");
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch popular movies from TMDB" }, { status: 502 });
  }
};
