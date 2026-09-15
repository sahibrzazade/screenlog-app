import { tmdbFetch } from "@/lib/tmdb/client";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { MediaCardItem } from "@/components/media-card";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

/** Resolves a bare TMDB id to a `MediaCardItem`, or null if it can't be fetched. */
export const resolveMediaCardItem = async (
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<MediaCardItem | null> => {
  try {
    const details =
      mediaType === "movie"
        ? await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`)
        : await tmdbFetch<TmdbShowDetails>(`/tv/${tmdbId}`);
    return toMediaCardItem(details, mediaType);
  } catch {
    return null;
  }
};
