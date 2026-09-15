import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";
import type { MediaCardItem } from "@/components/media-card";

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
        resolveMediaCardItem(row.tmdb_id, row.media_type as "movie" | "tv"),
      ),
    )
  ).filter((item): item is MediaCardItem => item !== null);

  return items;
};
