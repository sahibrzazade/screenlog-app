import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";
import type { MediaCardItem } from "@/components/media-card";

export type Showcase = {
  topMovieIds: number[];
  topShowIds: number[];
  nowWatchingShowId: number | null;
};

export type ShowcaseItems = {
  topMovies: MediaCardItem[];
  topShows: MediaCardItem[];
  nowWatching: MediaCardItem | null;
};

const emptyShowcase: Showcase = {
  topMovieIds: [],
  topShowIds: [],
  nowWatchingShowId: null,
};

export const getShowcase = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<Showcase> => {
  const { data } = await supabase
    .from("profiles")
    .select("top_movie_ids, top_show_ids, now_watching_show_id")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return emptyShowcase;

  return {
    topMovieIds: data.top_movie_ids ?? [],
    topShowIds: data.top_show_ids ?? [],
    nowWatchingShowId: data.now_watching_show_id,
  };
};

const resolveOrdered = async (
  ids: number[],
  mediaType: "movie" | "tv",
): Promise<MediaCardItem[]> => {
  const items = await Promise.all(ids.map((id) => resolveMediaCardItem(id, mediaType)));
  return items.filter((item): item is MediaCardItem => item !== null);
};

/** Resolves a `Showcase`'s bare TMDB ids into displayable `MediaCardItem`s, preserving order. */
export const resolveShowcaseItems = async (showcase: Showcase): Promise<ShowcaseItems> => {
  const [topMovies, topShows, nowWatching] = await Promise.all([
    resolveOrdered(showcase.topMovieIds, "movie"),
    resolveOrdered(showcase.topShowIds, "tv"),
    showcase.nowWatchingShowId === null
      ? Promise.resolve(null)
      : resolveMediaCardItem(showcase.nowWatchingShowId, "tv"),
  ]);

  return { topMovies, topShows, nowWatching };
};
