import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbShowDetails } from "@/lib/tmdb/types";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  try {
    const data = await tmdbFetch<TmdbShowDetails>(`/tv/${id}`, { append_to_response: "credits" });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to fetch show from TMDB" }, { status: 502 });
  }
};
