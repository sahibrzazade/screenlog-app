import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Star } from "lucide-react";
import { posterUrl } from "@/lib/tmdb/images";
import type { TmdbSeasonSummary } from "@/lib/tmdb/types";

export type SeasonLogSummary = {
  rating: number | null;
  review: string | null;
  watchedDate: string;
};

type SeasonListProps = {
  tmdbShowId: number;
  seasons: TmdbSeasonSummary[];
  existingLogs: Record<number, SeasonLogSummary>;
};

/** A season index on the show page — each row links out to that season's own page. */
export const SeasonList = ({ tmdbShowId, seasons, existingLogs }: SeasonListProps) => (
  <details className="group mt-2 rounded-md border border-border bg-surface">
    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
      <span>
        {seasons.length} season{seasons.length === 1 ? "" : "s"}
      </span>
      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
    </summary>
    <ul className="flex flex-col gap-2 border-t border-border px-4 pt-4 pb-4">
      {seasons.map((season) => {
        const poster = posterUrl(season.poster_path, "w154");
        const rating = existingLogs[season.season_number]?.rating ?? null;

        return (
          <li key={season.season_number} className="border-t border-border first:border-t-0">
            <Link
              href={`/tv/${tmdbShowId}/season/${season.season_number}`}
              className="flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-surface"
            >
              <div className="aspect-2/3 w-12 shrink-0 overflow-hidden rounded bg-surface">
                {poster ? (
                  <Image
                    src={poster}
                    alt={season.name}
                    width={92}
                    height={138}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-[10px] text-subtle-foreground">
                    No poster
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">{season.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {season.episode_count} episode{season.episode_count === 1 ? "" : "s"}
                </p>
              </div>
              {rating !== null && (
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-accent text-accent" />
                  {rating}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  </details>
);
