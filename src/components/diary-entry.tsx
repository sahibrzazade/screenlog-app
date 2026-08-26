import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Parse/format in UTC so the displayed calendar date matches the stored
// date regardless of the viewer's timezone.
const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export type DiaryEntryData = {
  id: string;
  title: string;
  posterPath: string | null;
  rating: number | null;
  review: string | null;
  watchedDate?: string;
  href: string;
};

type DiaryEntryProps = {
  entry: DiaryEntryData;
};

export const DiaryEntry = ({ entry }: DiaryEntryProps) => (
  <li className="flex gap-3 border-t border-border py-3 first:border-t-0 first:pt-0">
    <Link href={entry.href} className="shrink-0">
      <div className="relative h-24 w-16 overflow-hidden rounded bg-surface">
        {entry.posterPath && (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${entry.posterPath}`}
            alt={entry.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
    </Link>
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <Link href={entry.href} className="font-medium hover:underline">
          {entry.title}
        </Link>
        {entry.watchedDate && (
          <span className="shrink-0 text-xs text-subtle-foreground">
            {formatDate(entry.watchedDate)}
          </span>
        )}
      </div>
      {entry.rating !== null && <RatingStars value={entry.rating} readOnly />}
      {entry.review && (
        <p className="text-sm text-muted-foreground">{entry.review}</p>
      )}
    </div>
  </li>
);
