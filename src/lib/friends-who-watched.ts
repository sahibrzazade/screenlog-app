import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProfileMap, type ReviewTable } from "@/lib/reviews";

export type FriendWhoWatched = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rating: number | null;
  /** Show logs only: the friend marked the show dropped. */
  dropped: boolean;
};

type FriendLogRow = {
  user_id: string;
  rating: number | string | null;
  /** Only selected from show_logs (migration 0017). */
  status?: string;
};

/**
 * People the viewer follows who logged this title (or season), newest
 * `watched_date` first. Empty for guests. A failed query also comes back empty,
 * which hides the section instead of breaking the title page.
 */
export const getFriendsWhoWatched = async (
  supabase: SupabaseClient,
  table: ReviewTable,
  match: Record<string, number>,
  viewerId: string | null,
): Promise<FriendWhoWatched[]> => {
  if (!viewerId) return [];

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId);
  const followedIds = (follows ?? []).map((row) => row.following_id as string);

  if (followedIds.length === 0) return [];

  // status exists only on show_logs. A conditional column list defeats the
  // client's select-string type parser, so the rows are typed explicitly.
  const columns: string = table === "show_logs" ? "user_id, rating, status" : "user_id, rating";
  const { data } = await supabase
    .from(table)
    .select(columns)
    .match(match)
    .in("user_id", followedIds)
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false });
  const logs = data as FriendLogRow[] | null;

  if (!logs || logs.length === 0) return [];

  const profileById = await fetchProfileMap(
    supabase,
    logs.map((log) => log.user_id),
  );

  // Drop users without a username: there is no profile to link the tile to.
  return logs.flatMap((log) => {
    const profile = profileById.get(log.user_id);
    if (!profile?.username) return [];
    return [
      {
        userId: log.user_id,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        rating: log.rating === null ? null : Number(log.rating),
        dropped: log.status === "dropped",
      },
    ];
  });
};
