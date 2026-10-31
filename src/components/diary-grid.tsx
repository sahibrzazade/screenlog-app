import Image from "next/image";
import Link from "next/link";
import { RatingStars } from "@/components/rating-stars";
import type { DiaryEntryData } from "@/components/diary-entry";
import { posterUrl } from "@/lib/tmdb/images";

type DiaryGridProps = {
  entries: DiaryEntryData[];
};

/** Letterboxd-style poster grid: the poster (title as alt/tooltip) with small stars beneath. */
export const DiaryGrid = ({ entries }: DiaryGridProps) => (
  <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
    {entries.map((entry) => {
      const poster = posterUrl(entry.posterPath);

      return (
        <li key={entry.id} className="flex flex-col gap-1.5">
          <Link
            href={entry.href}
            title={entry.title}
            className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-surface transition-transform duration-200 group-hover:scale-[1.03]">
              {poster ? (
                <Image
                  src={poster}
                  alt={entry.title}
                  fill
                  sizes="(min-width: 640px) 160px, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-1 text-center text-xs text-subtle-foreground">
                  {entry.title}
                </div>
              )}
            </div>
          </Link>
          {entry.rating !== null && <RatingStars value={entry.rating} readOnly small />}
        </li>
      );
    })}
  </ul>
);
