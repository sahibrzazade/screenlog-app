"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageSquareText, RotateCw } from "lucide-react";
import { RatingStars } from "@/components/rating-stars";
import { DroppedBadge } from "@/components/dropped-badge";
import { loadMoreDiary } from "@/app/diary/actions";
import { posterUrl } from "@/lib/tmdb/images";
import { formatDayOfMonth, formatWeekday, groupByMonth } from "@/lib/diary-dates";
import type { DiaryCursor, DiaryTimelineEntry } from "@/lib/diary-timeline";

type DiaryTimelineProps = {
  initialEntries: DiaryTimelineEntry[];
  initialCursor: DiaryCursor | null;
};

/**
 * The diary as one dated list, grouped by month under headings that stick
 * below the navbar. The first page is server-rendered; "Show more" appends
 * the next page, continuing a month split across pages under one heading.
 */
export const DiaryTimeline = ({ initialEntries, initialCursor }: DiaryTimelineProps) => {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showMore = () => {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const page = await loadMoreDiary(cursor);
        setEntries((current) => [...current, ...page.entries]);
        setCursor(page.nextCursor);
      } catch {
        setError("Couldn't load more entries. Please try again.");
      }
    });
  };

  return (
    <div className="mt-4">
      {groupByMonth(entries).map((month) => (
        <section key={month.key} aria-labelledby={`diary-${month.key}`} className="mt-2 first:mt-0">
          <h2
            id={`diary-${month.key}`}
            // top-14: the sticky navbar is h-14, so the heading sits just below it.
            className="sticky top-14 z-10 border-b border-border bg-background/95 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur-sm"
          >
            {month.label}
          </h2>
          <ol className="flex flex-col py-1">
            {month.entries.map((entry, index) => (
              <DiaryTimelineRow
                key={entry.id}
                entry={entry}
                firstOfDay={index === 0 || month.entries[index - 1].watchedDate !== entry.watchedDate}
              />
            ))}
          </ol>
        </section>
      ))}

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

const TYPE_LABEL = { movie: "Movie", show: "Show", season: "Season" } as const;

type DiaryTimelineRowProps = {
  entry: DiaryTimelineEntry;
  /** Only the first row of a day shows the date, so a day reads as one block. */
  firstOfDay: boolean;
};

const DiaryTimelineRow = ({ entry, firstOfDay }: DiaryTimelineRowProps) => {
  const poster = posterUrl(entry.posterPath);

  return (
    <li>
      <Link
        href={entry.href}
        className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex w-9 shrink-0 flex-col items-center leading-tight">
          {firstOfDay && (
            <time dateTime={entry.watchedDate} className="contents">
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {formatDayOfMonth(entry.watchedDate)}
              </span>
              <span className="text-xs text-subtle-foreground">{formatWeekday(entry.watchedDate)}</span>
            </time>
          )}
        </span>

        <span className="relative h-15 w-10 shrink-0 overflow-hidden rounded bg-surface">
          {poster && <Image src={poster} alt="" fill sizes="40px" className="object-cover" />}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-foreground">{entry.title}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {TYPE_LABEL[entry.mediaType]}
              {entry.year && ` · ${entry.year}`}
              {entry.dropped && <DroppedBadge />}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {entry.rating !== null ? (
              <RatingStars value={entry.rating} readOnly small />
            ) : (
              <span className="text-xs text-muted-foreground">Watched</span>
            )}
            {/* From sm the markers sit left of the stars so the stars line up at the right edge;
                on mobile the row is left-aligned, so the stars come first to line up there. */}
            {(entry.rewatch || entry.hasReview) && (
              <span className="flex items-center gap-2 sm:order-first">
                {entry.rewatch && (
                  <>
                    <RotateCw className="size-4 text-muted-foreground" aria-hidden />
                    <span className="sr-only">Rewatch</span>
                  </>
                )}
                {entry.hasReview && (
                  <>
                    <MessageSquareText className="size-4 text-muted-foreground" aria-hidden />
                    <span className="sr-only">Has review</span>
                  </>
                )}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
};
