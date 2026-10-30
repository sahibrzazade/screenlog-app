import type { NextRequest } from "next/server";
import { tmdbFetch } from "@/lib/tmdb/client";
import { MIN_VOTE_COUNT, NON_SCRIPTED_TV_GENRE_IDS } from "@/lib/tmdb/discover";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

export const GET = async (request: NextRequest) => {
  const genres = request.nextUrl.searchParams.get("genres");
  const type = request.nextUrl.searchParams.get("type");

  if (!genres) {
    return Response.json({ error: "Missing required query param: genres" }, { status: 400 });
  }

  if (type !== "movie" && type !== "tv") {
    return Response.json({ error: "type must be 'movie' or 'tv'" }, { status: 400 });
  }

  try {
    const data = await tmdbFetch<TmdbSearchResponse>(`/discover/${type}`, {
      sort_by: "popularity.desc",
      "vote_count.gte": MIN_VOTE_COUNT,
      with_genres: genres,
      ...(type === "tv" ? { without_genres: NON_SCRIPTED_TV_GENRE_IDS } : {}),
    });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch discover results from TMDB" }, { status: 502 });
  }
};
