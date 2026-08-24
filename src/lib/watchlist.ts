import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import type { MediaCardItem } from "@/components/media-card";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

const toWatchlistItem = async (
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<MediaCardItem | null> => {
  try {
    if (mediaType === "movie") {
      const movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`);
      return {
        id: tmdbId,
        mediaType,
        title: movie.title,
        year: movie.release_date?.slice(0, 4) || null,
        posterPath: movie.poster_path,
      };
    }

    const show = await tmdbFetch<TmdbShowDetails>(`/tv/${tmdbId}`);
    return {
      id: tmdbId,
      mediaType,
      title: show.name,
      year: show.first_air_date?.slice(0, 4) || null,
      posterPath: show.poster_path,
    };
  } catch {
    return null;
  }
};

export const getWatchlistItems = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<MediaCardItem[]> => {
  const { data: watchlistRows } = await supabase
    .from("watchlist")
    .select("tmdb_id, media_type")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  const items = (
    await Promise.all(
      (watchlistRows ?? []).map((row) =>
        toWatchlistItem(row.tmdb_id, row.media_type as "movie" | "tv"),
      ),
    )
  ).filter((item): item is MediaCardItem => item !== null);

  return items;
};
