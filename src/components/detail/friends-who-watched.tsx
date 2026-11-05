import Image from "next/image";
import Link from "next/link";
import { DroppedBadge } from "@/components/dropped-badge";
import { RatingStars } from "@/components/rating-stars";
import type { FriendWhoWatched } from "@/lib/friends-who-watched";

/** Tiles the section holds; past this, the last slot becomes "+N". */
const MAX_SLOTS = 8;

const friendLabel = ({ username, rating, dropped }: FriendWhoWatched) =>
  `${username}, ${rating === null ? "watched" : `rated ${rating} out of 5`}${dropped ? ", dropped" : ""}`;

const FriendTile = ({ friend }: { friend: FriendWhoWatched }) => (
  <Link
    href={`/user/${friend.username}`}
    aria-label={friendLabel(friend)}
    className="flex flex-col items-center gap-1 rounded-md py-1 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-surface">
      <Image src={friend.avatarUrl || "/default-avatar.png"} alt="" fill sizes="40px" className="object-cover" />
    </span>
    <span className="w-full truncate px-1 text-center text-xs font-medium">{friend.username}</span>
    {friend.rating === null ? (
      <span className="text-xs text-muted-foreground">Watched</span>
    ) : (
      <RatingStars value={friend.rating} readOnly small />
    )}
    {friend.dropped && <DroppedBadge />}
  </Link>
);

/**
 * People the viewer follows who logged this title. Renders nothing for guests
 * and when no friend logged it. Tiles are as wide as the small stars (78px), so
 * four fit a phone and they wrap instead of scrolling sideways.
 */
export const FriendsWhoWatched = ({ friends }: { friends: FriendWhoWatched[] }) => {
  if (friends.length === 0) return null;

  const visible = friends.length > MAX_SLOTS ? friends.slice(0, MAX_SLOTS - 1) : friends;
  const hiddenCount = friends.length - visible.length;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Friends who watched</h2>
        <span className="text-sm text-muted-foreground">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {visible.map((friend) => (
          <li key={friend.userId} className="w-19.5">
            <FriendTile friend={friend} />
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="flex w-19.5 justify-center py-1">
            <span className="flex size-10 items-center justify-center rounded-full bg-surface text-sm font-medium text-muted-foreground tabular-nums">
              +{hiddenCount}
            </span>
          </li>
        )}
      </ul>
    </section>
  );
};
