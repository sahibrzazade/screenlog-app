import type { MediaCardItem } from "@/components/media-card";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

export const toMediaCardItem = (
  result: TmdbSearchResult,
  mediaType: "movie" | "tv",
): MediaCardItem => ({
  id: result.id,
  mediaType,
  title: (mediaType === "movie" ? result.title : result.name) ?? "Untitled",
  year:
    (mediaType === "movie"
      ? result.release_date
      : result.first_air_date
    )?.slice(0, 4) || null,
  posterPath: result.poster_path,
});
