import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiaryData, type DiaryEntry } from "@/lib/diary";
import { getShowcase, resolveShowcaseItems, type ShowcaseItems } from "@/lib/showcase";

export type PublicProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  showcase: ShowcaseItems;
  movies: DiaryEntry[];
  shows: DiaryEntry[];
};

/**
 * A user's public profile by username: showcase + logged movies/shows.
 * Relies on migration 0014's RLS/grants making `profiles` and the log
 * tables readable by anyone, not just the owner — works for guests too.
 * Returns null when no such username exists.
 */
export const getPublicProfileByUsername = async (
  supabase: SupabaseClient,
  username: string,
): Promise<PublicProfile | null> => {
  const { data: profile } = await supabase
    .from("profiles_public")
    .select("id, username, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return null;

  const [showcase, diary] = await Promise.all([
    getShowcase(supabase, profile.id).then(resolveShowcaseItems),
    getDiaryData(supabase, profile.id),
  ]);

  return {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    showcase,
    movies: diary.movies,
    shows: diary.shows,
  };
};
