"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { DroppedBadge } from "@/components/dropped-badge";
import { RatingStars } from "@/components/rating-stars";
import type { FriendWhoWatched } from "@/lib/friends-who-watched";

/** Tiles the section holds; past this, the last slot becomes "+N". */
const MAX_SLOTS = 8;

const friendLabel = ({ username, rating, dropped }: FriendWhoWatched) =>
  `${username}, ${rating === null ? "watched" : `rated ${rating} out of 5`}${dropped ? ", dropped" : ""}`;

const FriendAvatar = ({ friend }: { friend: FriendWhoWatched }) => (
  <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-surface">
    <Image src={friend.avatarUrl || "/default-avatar.png"} alt="" fill sizes="40px" className="object-cover" />
  </span>
);

const FriendRating = ({ friend }: { friend: FriendWhoWatched }) =>
  friend.rating === null ? (
    <span className="text-xs text-muted-foreground">Watched</span>
  ) : (
    <RatingStars value={friend.rating} readOnly small />
  );

const FriendTile = ({ friend }: { friend: FriendWhoWatched }) => (
  <Link
    href={`/user/${friend.username}`}
    aria-label={friendLabel(friend)}
    className="flex flex-col items-center gap-1 rounded-md py-1 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <FriendAvatar friend={friend} />
    <span className="w-full truncate px-1 text-center text-xs font-medium">{friend.username}</span>
    <FriendRating friend={friend} />
    {friend.dropped && <DroppedBadge />}
  </Link>
);

type FriendsDialogProps = {
  friends: FriendWhoWatched[];
  open: boolean;
  onClose: () => void;
};

/**
 * Every friend with their full username. Same look as `UserListDialog`, which
 * isn't reused: it fetches on open and adds Follow buttons, while this list is
 * already loaded and the viewer follows everyone on it.
 */
const FriendsDialog = ({ friends, open, onClose }: FriendsDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            Friends who watched
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {open && (
            <ul className="flex flex-col gap-1">
              {friends.map((friend) => (
                <li key={friend.userId}>
                  <Link
                    href={`/user/${friend.username}`}
                    onClick={onClose}
                    aria-label={friendLabel(friend)}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FriendAvatar friend={friend} />
                    {/* The full name wraps here: this is where a truncated tile name can be read. */}
                    <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{friend.username}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <FriendRating friend={friend} />
                      {friend.dropped && <DroppedBadge />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
};

/**
 * People the viewer follows who logged this title. Renders nothing for guests
 * and when no friend logged it. Tiles are as wide as the small stars (78px), so
 * four fit a phone and they wrap instead of scrolling sideways. The count and
 * "+N" open the full list.
 */
export const FriendsWhoWatched = ({ friends }: { friends: FriendWhoWatched[] }) => {
  const [open, setOpen] = useState(false);

  if (friends.length === 0) return null;

  const visible = friends.length > MAX_SLOTS ? friends.slice(0, MAX_SLOTS - 1) : friends;
  const hiddenCount = friends.length - visible.length;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Friends who watched</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="shrink-0 cursor-pointer rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {visible.map((friend) => (
          <li key={friend.userId} className="w-19.5">
            <FriendTile friend={friend} />
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="flex w-19.5 justify-center py-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              // Starts with the visible text, so voice control ("click +5") still works.
              aria-label={`+${hiddenCount} more friends`}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface text-sm font-medium text-muted-foreground tabular-nums transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{hiddenCount}
            </button>
          </li>
        )}
      </ul>
      <FriendsDialog friends={friends} open={open} onClose={() => setOpen(false)} />
    </section>
  );
};
