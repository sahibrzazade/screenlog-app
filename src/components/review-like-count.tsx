"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getReviewLikers } from "@/lib/review-likes";
import type { ReviewKind } from "@/lib/validation/review-like";
import { UserListDialog } from "@/components/user-list-dialog";

type ReviewLikeCountProps = {
  count: number;
  logKind: ReviewKind;
  logId: string;
  /** Signed-in viewer's id; null for guests (no Follow buttons in the list). */
  viewerId: string | null;
};

/**
 * A review's like count; clicking it opens who liked it, newest first.
 * Nothing at zero.
 */
export const ReviewLikeCount = ({ count, logKind, logId, viewerId }: ReviewLikeCountProps) => {
  const [open, setOpen] = useState(false);
  const loadLikers = useCallback(
    () => getReviewLikers(createClient(), logKind, logId, viewerId),
    [logKind, logId, viewerId],
  );

  if (count === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        // Starts with the visible number, so voice control ("click 12") still works.
        aria-label={`${count.toLocaleString("en-US")} ${count === 1 ? "like" : "likes"}`}
        className="min-h-6 min-w-6 cursor-pointer rounded-md px-1 text-xs text-muted-foreground tabular-nums transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {count.toLocaleString("en-US")}
      </button>
      <UserListDialog
        openKey={open ? logId : null}
        title="Liked by"
        emptyMessage="No likes yet."
        load={loadLikers}
        viewerId={viewerId}
        onClose={() => setOpen(false)}
      />
    </>
  );
};
