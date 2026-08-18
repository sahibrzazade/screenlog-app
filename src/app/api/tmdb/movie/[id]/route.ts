import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  try {
    const data = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, { append_to_response: "credits" });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch movie from TMDB" }, { status: 502 });
  }
};
