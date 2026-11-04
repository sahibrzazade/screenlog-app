"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/supabase/auth";
import { REVIEW_KIND_TABLE, isLikeable } from "@/lib/review-likes";
import { reviewLikeToggleSchema, type ReviewKind } from "@/lib/validation/review-like";

export type ToggleReviewLikeState = { liked: boolean; error?: string };

const UNIQUE_VIOLATION = "23505";

/** Pages that render reviews of each kind, so their counts refresh on navigation. */
const REVIEW_PAGE: Record<ReviewKind, string> = {
  movie: "/movie/[id]",
  show: "/tv/[id]",
  season: "/tv/[id]/season/[seasonNumber]",
};

/**
 * Like or unlike a review (a log row). The 0018 insert policy enforces the
 * same rules; checking here first gives a clear message instead of a
 * generic RLS failure.
 */
export const toggleReviewLike = async (
  prevState: ToggleReviewLikeState,
  formData: FormData,
): Promise<ToggleReviewLikeState> => {
  const parsed = reviewLikeToggleSchema.safeParse({
    logKind: formData.get("logKind"),
    logId: formData.get("logId"),
    liked: formData.get("liked"),
  });

  if (!parsed.success) {
    return { ...prevState, error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { ...prevState, error: "You must be logged in to like reviews." };
  }

  const { logKind, logId, liked } = parsed.data;
  const { table, likeColumn } = REVIEW_KIND_TABLE[logKind];

  if (liked) {
    const { error } = await supabase
      .from("review_likes")
      .delete()
      .eq("user_id", user.id)
      .eq(likeColumn, logId);

    if (error) {
      return { ...prevState, error: "Failed to unlike. Please try again." };
    }
  } else {
    const { data: log } = await supabase
      .from(table)
      .select("user_id, review")
      .eq("id", logId)
      .maybeSingle();

    if (!log) {
      return { ...prevState, error: "This review no longer exists." };
    }
    if (log.user_id === user.id) {
      return { ...prevState, error: "You can't like your own review." };
    }
    if (!isLikeable(log.review)) {
      return { ...prevState, error: "Only written reviews can be liked." };
    }

    const { error } = await supabase
      .from("review_likes")
      .insert({ user_id: user.id, [likeColumn]: logId });

    // Already liked (e.g. a double submit from another tab): the desired end
    // state already holds, so treat it as success.
    if (error && error.code !== UNIQUE_VIOLATION) {
      return { ...prevState, error: "Failed to like. Please try again." };
    }
  }

  revalidatePath(REVIEW_PAGE[logKind], "page");
  revalidatePath("/user/[username]/likes", "page");
  return { liked: !liked };
};
