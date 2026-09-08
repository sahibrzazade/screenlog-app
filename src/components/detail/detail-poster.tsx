import Image from "next/image";
import { WatchlistButton } from "@/components/watchlist-button";

type DetailPosterProps = {
  /** Full poster URL, or null when the title has no poster. */
  url: string | null;
  alt: string;
  /** When set, a watchlist toggle is overlaid on the poster's top-right. */
  watchlist?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
    inWatchlist: boolean;
  };
};

/** Sidebar poster on a detail page, with an optional watchlist toggle overlay. */
export const DetailPoster = ({ url, alt, watchlist }: DetailPosterProps) => (
  <div className="relative overflow-hidden rounded-md bg-surface">
    {url ? (
      <Image src={url} alt={alt} width={185} height={278} className="h-auto w-full" />
    ) : (
      <div className="flex aspect-[2/3] items-center justify-center text-center text-xs text-subtle-foreground">
        No poster
      </div>
    )}
    {watchlist && (
      <div className="absolute top-2 right-2">
        <WatchlistButton
          tmdbId={watchlist.tmdbId}
          mediaType={watchlist.mediaType}
          initialInWatchlist={watchlist.inWatchlist}
        />
      </div>
    )}
  </div>
);
