import type { SupabaseClient } from "@supabase/supabase-js";
import { tmdbFetch } from "@/lib/tmdb/client";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { MediaCardItem } from "@/components/media-card";
import type { TmdbMovieDetails, TmdbShowDetails } from "@/lib/tmdb/types";

const toWatchlistItem = async (
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
