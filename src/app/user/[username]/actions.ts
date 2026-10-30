"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/supabase/auth";
import { followToggleSchema } from "@/lib/validation/follow";

export type ToggleFollowState = { following: boolean; error?: string };

const UNIQUE_VIOLATION = "23505";

export const toggleFollow = async (
  prevState: ToggleFollowState,
  formData: FormData,
): Promise<ToggleFollowState> => {
  const parsed = followToggleSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
    following: formData.get("following"),
  });

  if (!parsed.success) {
    return { ...prevState, error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { ...prevState, error: "You must be logged in to follow people." };
  }

  const { targetUserId, following } = parsed.data;

  // The DB check constraint rejects this too; checking here gives a clear
  // message instead of a generic failure.
  if (targetUserId === user.id) {
    return { ...prevState, error: "You can't follow yourself." };
  }

  if (following) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);

    if (error) {
      return { ...prevState, error: "Failed to unfollow. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetUserId });

    // Already following (e.g. a double submit from another tab): the desired
    // end state already holds, so treat it as success.
    if (error && error.code !== UNIQUE_VIOLATION) {
      return { ...prevState, error: "Failed to follow. Please try again." };
    }
  }

  revalidatePath("/user/[username]", "page");
  return { following: !following };
};
