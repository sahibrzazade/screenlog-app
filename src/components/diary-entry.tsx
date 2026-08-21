import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

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
  <li className="flex gap-3 border-t border-neutral-800 py-3 first:border-t-0 first:pt-0">
    <Link href={entry.href} className="shrink-0">
      <div className="relative h-24 w-16 overflow-hidden rounded bg-neutral-800">
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
          <span className="shrink-0 text-xs text-neutral-500">{entry.watchedDate}</span>
        )}
      </div>
      {entry.rating !== null && <RatingStars value={entry.rating} readOnly />}
      {entry.review && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{entry.review}</p>
      )}
    </div>
  </li>
);
