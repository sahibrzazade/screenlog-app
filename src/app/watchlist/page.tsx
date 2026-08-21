import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { WatchlistGrid } from "@/components/watchlist-grid";
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

const WatchlistPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: watchlistRows } = user
    ? await supabase
        .from("watchlist")
        .select("tmdb_id, media_type")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false })
    : { data: [] };

  const items = (
    await Promise.all(
      (watchlistRows ?? []).map((row) =>
        toWatchlistItem(row.tmdb_id, row.media_type as "movie" | "tv"),
      ),
    )
  ).filter((item): item is MediaCardItem => item !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      <WatchlistGrid initialItems={items} />
    </main>
  );
};

export default WatchlistPage;
