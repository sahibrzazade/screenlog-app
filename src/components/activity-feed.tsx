"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";
import { loadMoreActivity } from "@/app/activity-actions";
import { posterUrl } from "@/lib/tmdb/images";
import { formatRelativeTime } from "@/lib/date";
import type { ActivityCursor, ActivityItem } from "@/lib/activity";

type ActivityFeedProps = {
  initialItems: ActivityItem[];
  initialCursor: ActivityCursor | null;
};

/**
 * Home page feed: the first page is server-rendered, "Show more" appends the
 * next page via a server action. Vertical list in the same visual language
 * as DiaryEntry / ReviewList (hairline separators, small poster, read-only stars).
 */
export const ActivityFeed = ({ initialItems, initialCursor }: ActivityFeedProps) => {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showMore = () => {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const page = await loadMoreActivity(cursor);
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      } catch {
        setError("Couldn't load more activity. Please try again.");
      }
    });
  };

  if (items.length === 0 && !cursor) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Nothing here yet.{" "}
        <Link href="/search?mode=people" className="text-accent hover:text-accent-hover">
          Find people to follow
        </Link>{" "}
        to see what they&apos;re watching.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <ul className="flex flex-col">
        {items.map((item) => (
          <ActivityRow key={item.key} item={item} />
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {cursor && (
        <button
          type="button"
          onClick={showMore}
          disabled={pending}
          className="mt-4 cursor-pointer rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  );
};

const titleHref = (item: ActivityItem) => {
  if (item.kind === "follow" || !item.title) return `/user/${item.username}`;
  if (item.kind === "log" && item.seasonNumber !== null) {
    return `/tv/${item.tmdbId}/season/${item.seasonNumber}`;
  }
  return item.mediaType === "movie" ? `/movie/${item.tmdbId}` : `/tv/${item.tmdbId}`;
};

const ActivityRow = ({ item }: { item: ActivityItem }) => {
  const href = titleHref(item);
  const poster = posterUrl(item.title?.posterPath);
  const titleText =
    item.kind === "log" && item.seasonNumber !== null
      ? `${item.title?.title} — Season ${item.seasonNumber}`
      : item.title?.title;

  const user = (
    <Link href={`/user/${item.username}`} className="font-medium text-foreground hover:underline">
      {item.username}
    </Link>
  );
  const title = (
    <Link href={href} className="font-medium text-foreground hover:underline">
      {titleText}
    </Link>
  );

  return (
    <li className="flex gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
      {item.kind === "follow" ? (
        <Link href={href} className="shrink-0">
          <div className="relative size-12 overflow-hidden rounded-full bg-surface">
            <Image
              src={item.avatarUrl || "/default-avatar.png"}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        </Link>
      ) : (
        <Link href={href} className="shrink-0">
          <div className="relative h-18 w-12 overflow-hidden rounded bg-surface">
            {poster && (
              <Image src={poster} alt={titleText ?? ""} fill sizes="48px" className="object-cover" />
            )}
          </div>
        </Link>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            {item.kind !== "follow" && (
              <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-surface">
                <Image
                  src={item.avatarUrl || "/default-avatar.png"}
                  alt=""
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </span>
            )}
            <span className="min-w-0">
              {item.kind === "follow" && <>{user} followed you</>}
              {item.kind === "watchlist" && (
                <>
                  {user} added {title} to their watchlist
                </>
              )}
              {item.kind === "log" && (
                <>
                  {user} {item.rewatch ? "rewatched" : "watched"} {title}
                </>
              )}
            </span>
          </p>
          <time
            dateTime={item.createdAt}
            // Relative time can differ by a minute between server and client render.
            suppressHydrationWarning
            className="shrink-0 text-xs text-subtle-foreground"
          >
            {formatRelativeTime(item.createdAt)}
          </time>
        </div>

        {item.kind === "log" && item.rating !== null && (
          <RatingStars value={item.rating} readOnly />
        )}
        {item.kind === "log" && item.review && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {item.review}
          </p>
        )}
      </div>
    </li>
  );
};
