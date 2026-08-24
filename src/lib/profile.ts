import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiaryData, type DiaryEntry } from "@/lib/diary";
import { getWatchlistItems } from "@/lib/watchlist";
import type { MediaCardItem } from "@/components/media-card";

export const PROFILE_SECTION_LIMIT = 4;

export type ProfileSection<T> = { items: T[]; total: number };

export type ProfileSummary = {
  watchlist: ProfileSection<MediaCardItem>;
  movies: ProfileSection<DiaryEntry>;
  shows: ProfileSection<DiaryEntry>;
};

export const toProfileSection = <T>(all: T[]): ProfileSection<T> => ({
  items: all.slice(0, PROFILE_SECTION_LIMIT),
  total: all.length,
});

export const getProfileSummary = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileSummary> => {
  const [watchlistItems, { movies, shows }] = await Promise.all([
    getWatchlistItems(supabase, userId),
    getDiaryData(supabase, userId),
  ]);

  return {
    watchlist: toProfileSection(watchlistItems),
    movies: toProfileSection(movies),
    shows: toProfileSection(shows),
  };
};
