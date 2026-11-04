"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getFollowList, type FollowListKind } from "@/lib/follows";
import { UserListDialog } from "@/components/user-list-dialog";

type ProfileStatsProps = {
  profileId: string;
  /** Used to link the film/show counts to that user's see-all lists. */
  username: string;
  films: number;
  shows: number;
  watchlist: number;
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

/**
 * Letterboxd-style stat strip for a profile header: films, shows, watchlist,
 * followers, following. The film/show/watchlist counts link to the user's
 * see-all lists; the two
 * follow counts open a modal on the same page listing those users (fetched on
 * open so the server render stays light).
 */
export const ProfileStats = ({
  profileId,
  username,
  films,
  shows,
  watchlist,
  followers,
  following,
  viewerId,
}: ProfileStatsProps) => {
  const [openKind, setOpenKind] = useState<FollowListKind | null>(null);
  const open = (kind: FollowListKind) => setOpenKind(kind);
  const loadList = useCallback(
    (kind: string) => getFollowList(createClient(), profileId, kind as FollowListKind, viewerId),
    [profileId, viewerId],
  );

  return (
    <>
      <div className="mt-6 grid grid-cols-5 divide-x divide-border border-y border-border py-3">
        <Stat
          value={films}
          label={films === 1 ? "Film" : "Films"}
          href={`/user/${username}/films`}
        />
        <Stat
          value={shows}
          label={shows === 1 ? "Show" : "Shows"}
          href={`/user/${username}/shows`}
        />
        <Stat value={watchlist} label="Watchlist" href={`/user/${username}/watchlist`} />
        <Stat
          value={followers}
          label={followers === 1 ? "Follower" : "Followers"}
          onClick={() => open("followers")}
        />
        <Stat value={following} label="Following" onClick={() => open("following")} />
      </div>

      <UserListDialog
        openKey={openKind}
        title={openKind ? TITLES[openKind] : ""}
        emptyMessage={openKind ? EMPTY_MESSAGES[openKind] : ""}
        load={loadList}
        viewerId={viewerId}
        onClose={() => setOpenKind(null)}
      />
    </>
  );
};

const INTERACTIVE_STAT_CLASS =
  "flex w-full cursor-pointer flex-col items-center rounded-md py-1 text-center transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * One stat cell: big number over a small uppercase label (same label style as
 * HomeSection headings). With `href` it's a link, with `onClick` a button.
 */
const Stat = ({
  value,
  label,
  href,
  onClick,
}: {
  value: number;
  label: string;
  href?: string;
  onClick?: () => void;
}) => {
  const content: ReactNode = (
    <>
      <span className="text-xl font-semibold text-foreground tabular-nums">{value}</span>
      {/* Tighter tracking/size on phones so five columns fit labels like "FOLLOWERS". */}
      <span className="mt-0.5 text-[0.625rem] tracking-normal text-muted-foreground uppercase sm:text-xs sm:tracking-widest">
        {label}
      </span>
    </>
  );
  // The number and label are separate spans, which would otherwise be read as "5Followers".
  const accessibleName = `${value} ${label}`;

  return (
    <div className="flex px-1">
      {href ? (
        <Link href={href} aria-label={accessibleName} className={INTERACTIVE_STAT_CLASS}>
          {content}
        </Link>
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={accessibleName}
          className={INTERACTIVE_STAT_CLASS}
        >
          {content}
        </button>
      ) : (
        <div className="flex w-full flex-col items-center py-1 text-center">{content}</div>
      )}
    </div>
  );
};
