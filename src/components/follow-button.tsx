"use client";

import { useActionState } from "react";
import {
  toggleFollow,
  type ToggleFollowState,
} from "@/app/user/[username]/actions";

type FollowButtonProps = {
  targetUserId: string;
  initialFollowing: boolean;
};

// Same shapes as the app's primary/secondary buttons. Both variants carry a
// border and a min width so toggling never shifts the layout.
const BASE_CLASS =
  "inline-flex min-w-24 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const FOLLOW_CLASS = `${BASE_CLASS} border-transparent bg-accent text-accent-foreground hover:bg-accent-hover`;
const FOLLOWING_CLASS = `${BASE_CLASS} border-border text-foreground hover:bg-surface`;

/**
 * Follow / unfollow toggle. The caller only renders it for signed-in viewers
 * on someone else's profile; the action and the DB check constraint also
 * reject guests and self-follows.
 */
export const FollowButton = ({
  targetUserId,
  initialFollowing,
}: FollowButtonProps) => {
  const [state, formAction, pending] = useActionState<
    ToggleFollowState,
    FormData
  >(toggleFollow, { following: initialFollowing });

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input type="hidden" name="following" value={String(state.following)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={state.following}
        className={state.following ? FOLLOWING_CLASS : FOLLOW_CLASS}
      >
        {state.following ? "Following" : "Follow"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
};
