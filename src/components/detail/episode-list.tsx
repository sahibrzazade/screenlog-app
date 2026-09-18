import Image from "next/image";
import { TmdbRating } from "@/components/detail/tmdb-rating";
import { stillUrl } from "@/lib/tmdb/images";
import type { TmdbEpisode } from "@/lib/tmdb/types";

type EpisodeListProps = {
  episodes: TmdbEpisode[];
};

export const EpisodeList = ({ episodes }: EpisodeListProps) => (
  <ul className="mt-2 flex flex-col gap-4">
    {episodes.map((episode) => {
      const still = stillUrl(episode.still_path);

      return (
        <li
          key={episode.id}
          className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start"
        >
          <div className="aspect-video w-full shrink-0 overflow-hidden rounded bg-surface sm:w-40">
            {still ? (
              <Image
                src={still}
                alt={episode.name}
                width={300}
                height={169}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[10px] text-subtle-foreground">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h3 className="font-medium">
                {episode.episode_number}. {episode.name}
              </h3>
              {episode.air_date && (
                <span className="text-xs text-muted-foreground">{episode.air_date}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              <TmdbRating voteAverage={episode.vote_average} voteCount={episode.vote_count} />
            </div>
            {episode.overview && <p className="mt-1 text-sm">{episode.overview}</p>}
          </div>
        </li>
      );
    })}
  </ul>
);
