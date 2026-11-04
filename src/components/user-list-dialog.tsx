"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { FollowListUser } from "@/lib/follows";
import { FollowButton } from "@/components/follow-button";

const SKELETON_ROWS = 3;

type UserListDialogProps = {
  /** Non-null while open; a different key loads a different list. */
  openKey: string | null;
  title: string;
  emptyMessage: string;
  /** Fetches the list for `openKey`. Keep it stable (useCallback) — a new function refetches. */
  load: (key: string) => Promise<FollowListUser[]>;
  /** Signed-in viewer's id; null for guests (rows then show no Follow button). */
  viewerId: string | null;
  onClose: () => void;
};

type Loaded = { key: string; users: FollowListUser[]; error: string | null };

/**
 * Modal list of users (avatar, username, Follow button) — the profile's
 * followers/following lists and a review's likers. The list is fetched each
 * time it opens, so the server render stays light.
 */
export const UserListDialog = ({ openKey, title, emptyMessage, load, viewerId, onClose }: UserListDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openKey && !dialog.open) {
      dialog.showModal();
    } else if (!openKey && dialog.open) {
      dialog.close();
    }
  }, [openKey]);

  useEffect(() => {
    if (!openKey) return;
    // Ignores a slow response for a list the user already closed or switched away from.
    let current = true;
    load(openKey).then(
      (users) => {
        if (current) setLoaded({ key: openKey, users, error: null });
      },
      () => {
        if (current) setLoaded({ key: openKey, users: [], error: "Couldn't load this list. Please try again." });
      },
    );
    return () => {
      current = false;
    };
  }, [openKey, load]);

  const close = () => {
    // Forget the list so reopening shows the skeleton and fresh data, not a stale list.
    setLoaded(null);
    onClose();
  };

  const isLoading = openKey !== null && loaded?.key !== openKey;
  const users = isLoading ? [] : (loaded?.users ?? []);
  const error = isLoading ? null : (loaded?.error ?? null);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold">
            {openKey ? title : ""}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div aria-busy={isLoading} className="max-h-[60vh] overflow-y-auto p-2">
          {isLoading && (
            <ul aria-hidden="true" className="flex flex-col gap-1">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={index} className="flex items-center gap-3 p-2">
                  <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface" />
                  <div className="h-4 w-32 animate-pulse rounded bg-surface" />
                </li>
              ))}
            </ul>
          )}

          {!isLoading && error && (
            <p role="alert" className="p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {!isLoading && !error && openKey && users.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>
          )}

          {!isLoading && !error && users.length > 0 && (
            <ul className="flex flex-col gap-1">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-3">
                  <Link
                    href={`/user/${user.username}`}
                    onClick={close}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-surface">
                      <Image
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <span className="truncate font-medium">{user.username}</span>
                  </Link>
                  {viewerId && user.id !== viewerId && (
                    <div className="pr-2">
                      <FollowButton targetUserId={user.id} initialFollowing={user.viewerFollows} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
};
