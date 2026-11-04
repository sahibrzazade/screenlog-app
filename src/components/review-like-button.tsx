"use client";

import { useActionState, useEffect, useOptimistic } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleReviewLike, type ToggleReviewLikeState } from "@/app/review-like-actions";
import type { ReviewKind } from "@/lib/validation/review-like";
import { ReviewLikeCount } from "@/components/review-like-count";

type ReviewLikeButtonProps = {
  logKind: ReviewKind;
  logId: string;
  initialLiked: boolean;
  initialCount: number;
  /** Used in the accessible name: "Like alice's review". */
  reviewerName: string;
  viewerId: string;
};

const BUTTON_CLASS =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait";

/**
 * Heart toggle for someone else's written review. Optimistic: the heart and
 * count flip on click and roll back (with an error toast) if the action
 * fails. Liked = filled accent heart, so the state isn't colour-only.
 */
export const ReviewLikeButton = ({
  logKind,
  logId,
  initialLiked,
  initialCount,
  reviewerName,
  viewerId,
}: ReviewLikeButtonProps) => {
  const [state, formAction, pending] = useActionState<ToggleReviewLikeState, FormData>(toggleReviewLike, {
    liked: initialLiked,
  });
  const [liked, setOptimisticLiked] = useOptimistic(state.liked);

  // initialCount includes the viewer's own like when initialLiked is true.
  const count = initialCount - (initialLiked ? 1 : 0) + (liked ? 1 : 0);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const action = (formData: FormData) => {
    setOptimisticLiked(!state.liked);
    formAction(formData);
  };

  return (
    <div className="flex flex-col items-center">
      <form action={action}>
        <input type="hidden" name="logKind" value={logKind} />
        <input type="hidden" name="logId" value={logId} />
        {/* The confirmed state, not the optimistic one: the action toggles from it. */}
        <input type="hidden" name="liked" value={String(state.liked)} />
        <button
          type="submit"
          disabled={pending}
          aria-pressed={liked}
          aria-label={`Like ${reviewerName}'s review`}
          className={`${BUTTON_CLASS} ${liked ? "text-accent hover:text-accent-hover" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className={`size-4 ${liked ? "fill-current" : ""}`} aria-hidden />
        </button>
      </form>
      {/* Outside the form: the likers modal holds Follow buttons, which are forms themselves. */}
      <ReviewLikeCount count={count} logKind={logKind} logId={logId} viewerId={viewerId} />
    </div>
  );
};
