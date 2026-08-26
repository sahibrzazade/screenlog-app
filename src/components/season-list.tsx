import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { LogSeasonForm } from "@/components/log-season-form";
import { ReviewList, type Review } from "@/components/review-list";
import type { TmdbSeasonSummary } from "@/lib/tmdb/types";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w154";

export type SeasonLogSummary = {
  rating: number | null;
  review: string | null;
  watchedDate: string;
};

type SeasonListProps = {
  tmdbShowId: number;
  seasons: TmdbSeasonSummary[];
  existingLogs: Record<number, SeasonLogSummary>;
  reviewsBySeason: Record<number, Review[]>;
  viewerId: string | null;
  canLog: boolean;
};

export const SeasonList = ({
  tmdbShowId,
  seasons,
  existingLogs,
  reviewsBySeason,
  viewerId,
  canLog,
}: SeasonListProps) => (
  <details className="group mt-2 rounded-md border border-border bg-surface">
    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
      <span>
        {seasons.length} season{seasons.length === 1 ? "" : "s"}
      </span>
      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
    </summary>
    <ul className="flex flex-col gap-6 border-t border-border px-4 pt-4 pb-4">
      {seasons.map((season) => (
        <li
          key={season.season_number}
          className="flex items-start gap-4 border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0"
        >
          <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded bg-neutral-800">
            {season.poster_path ? (
              <Image
                src={`${TMDB_POSTER_BASE_URL}${season.poster_path}`}
                alt={season.name}
                width={92}
                height={138}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[10px] text-neutral-400">
                No poster
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{season.name}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {season.episode_count} episode{season.episode_count === 1 ? "" : "s"}
            </p>
            {canLog && (
              <LogSeasonForm
                tmdbShowId={tmdbShowId}
                seasonNumber={season.season_number}
                initialLog={existingLogs[season.season_number] ?? null}
              />
            )}
            <div className="mt-3">
              <ReviewList
                reviews={reviewsBySeason[season.season_number] ?? []}
                viewerId={viewerId}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  </details>
);
