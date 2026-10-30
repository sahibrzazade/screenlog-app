import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowListKind = "followers" | "following";

export type FollowListUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  /** Whether the viewer follows this user; always false for guests. */
  viewerFollows: boolean;
};

/** Follower/following counts for a profile. `follows` is publicly readable (0015). */
export const getFollowCounts = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<{ followers: number; following: number }> => {
  const [followers, following] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return { followers: followers.count ?? 0, following: following.count ?? 0 };
};

/**
 * The users who follow `userId` ("followers") or whom `userId` follows
 * ("following"), newest follow first, each flagged with whether the viewer
 * already follows them (so each row's Follow button starts in the right state).
 */
export const getFollowList = async (
  supabase: SupabaseClient,
  userId: string,
  kind: FollowListKind,
  viewerId: string | null,
): Promise<FollowListUser[]> => {
  const [matchColumn, otherColumn] =
    kind === "followers"
      ? (["following_id", "follower_id"] as const)
      : (["follower_id", "following_id"] as const);

  const { data: rows } = await supabase
    .from("follows")
    .select(otherColumn)
    .eq(matchColumn, userId)
    .order("created_at", { ascending: false });

  const ids = (rows ?? []).map((row) => (row as Record<string, string>)[otherColumn]);
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: viewerFollowRows }] = await Promise.all([
    supabase.from("profiles_public").select("id, username, avatar_url").in("id", ids),
    viewerId
      ? supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .in("following_id", ids)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const viewerFollowIds = new Set((viewerFollowRows ?? []).map((row) => row.following_id));

  // Keep the follow order; drop users without a username (no profile page to link to).
  return ids.flatMap((id) => {
    const profile = profileById.get(id);
    if (!profile?.username) return [];
    return [
      {
        id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        viewerFollows: viewerFollowIds.has(id),
      },
    ];
  });
};
