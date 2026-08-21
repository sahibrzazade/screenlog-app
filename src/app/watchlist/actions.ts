"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { watchlistToggleSchema } from "@/lib/validation/watchlist";

export type ToggleWatchlistState = { inWatchlist: boolean; error?: string };

export const toggleWatchlist = async (
  prevState: ToggleWatchlistState,
  formData: FormData,
): Promise<ToggleWatchlistState> => {
  const parsed = watchlistToggleSchema.safeParse({
    tmdbId: formData.get("tmdbId"),
    mediaType: formData.get("mediaType"),
    inWatchlist: formData.get("inWatchlist"),
  });

  if (!parsed.success) {
    return { ...prevState, error: "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...prevState,
      error: "You must be logged in to use your watchlist.",
    };
  }

  const { tmdbId, mediaType, inWatchlist } = parsed.data;

  if (inWatchlist) {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType);

    if (error) {
      return {
        ...prevState,
        error: "Failed to update your watchlist. Please try again.",
      };
    }

    revalidatePath("/watchlist");
    revalidatePath(
      mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`,
    );
    return { inWatchlist: false };
  }

  const { error } = await supabase
    .from("watchlist")
    .insert({ user_id: user.id, tmdb_id: tmdbId, media_type: mediaType });

  if (error) {
    return {
      ...prevState,
      error: "Failed to update your watchlist. Please try again.",
    };
  }

  revalidatePath("/watchlist");
  revalidatePath(mediaType === "movie" ? `/movie/${tmdbId}` : `/tv/${tmdbId}`);
  return { inWatchlist: true };
};
