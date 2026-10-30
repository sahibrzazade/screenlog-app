"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getFollowList, type FollowListKind, type FollowListUser } from "@/lib/follows";
import { FollowButton } from "@/components/follow-button";

type ProfileStatsProps = {
  profileId: string;
  films: number;
  shows: number;
  followers: number;
  following: number;
  /** Signed-in viewer's id; null for guests (list rows then show no Follow button). */
  viewerId: string | null;
};

const TITLES: Record<FollowListKind, string> = {
  followers: "Followers",
  following: "Following",
};

const EMPTY_MESSAGES: Record<FollowListKind, string> = {
  followers: "No followers yet.",
  following: "Not following anyone yet.",
};

const SKELETON_ROWS = 3;

/**
 * Letterboxd-style stat strip for a profile header: films, shows, followers,
 * following. The two follow counts open a modal on the same page listing
 * those users; the list is fetched on open so the server render stays light.
 */
export const ProfileStats = ({
  profileId,
  films,
  shows,
  followers,
  following,
  viewerId,
}: ProfileStatsProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openKind, setOpenKind] = useState<FollowListKind | null>(null);
  const [loadedKind, setLoadedKind] = useState<FollowListKind | null>(null);
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Guards against a slow response for a list the user already switched away from.
  const requestedKindRef = useRef<FollowListKind | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openKind && !dialog.open) {
      dialog.showModal();
    } else if (!openKind && dialog.open) {
      dialog.close();
    }
  }, [openKind]);

  const open = async (kind: FollowListKind) => {
    setOpenKind(kind);
    setLoadedKind(null);
    setError(null);
    requestedKindRef.current = kind;

    try {
      const list = await getFollowList(createClient(), profileId, kind, viewerId);
      if (requestedKindRef.current !== kind) return;
      setUsers(list);
    } catch {
      if (requestedKindRef.current !== kind) return;
      setUsers([]);
      setError("Couldn't load this list. Please try again.");
    }
    setLoadedKind(kind);
  };

  const close = () => {
    requestedKindRef.current = null;
    setOpenKind(null);
  };

  const isLoading = openKind !== null && loadedKind !== openKind;

  return (
    <>
      <div className="mt-6 grid grid-cols-4 divide-x divide-border border-y border-border py-3">
        <Stat value={films} label={films === 1 ? "Film" : "Films"} />
        <Stat value={shows} label={shows === 1 ? "Show" : "Shows"} />
        <Stat
          value={followers}
          label={followers === 1 ? "Follower" : "Followers"}
          onClick={() => open("followers")}
        />
        <Stat value={following} label="Following" onClick={() => open("following")} />
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="follow-list-title"
        onClose={close}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="m-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
      >
        <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 id="follow-list-title" className="text-base font-semibold">
              {openKind ? TITLES[openKind] : ""}
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

            {!isLoading && !error && openKind && users.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">{EMPTY_MESSAGES[openKind]}</p>
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
    </>
  );
};

/** One stat cell: big number over a small uppercase label (same label style as HomeSection headings). */
const Stat = ({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) => {
  const content: ReactNode = (
    <>
      <span className="text-xl font-semibold text-foreground tabular-nums">{value}</span>
      <span className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase sm:tracking-widest">
        {label}
      </span>
    </>
  );

  return (
    <div className="flex px-1">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          // The number and label are separate spans, which would otherwise be read as "5Followers".
          aria-label={`${value} ${label}`}
          className="flex w-full cursor-pointer flex-col items-center rounded-md py-1 text-center transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      ) : (
        <div className="flex w-full flex-col items-center py-1 text-center">{content}</div>
      )}
    </div>
  );
};
