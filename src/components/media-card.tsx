import Image from "next/image";
import Link from "next/link";
import { WatchlistButton } from "@/components/watchlist-button";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

export type MediaCardItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string | null;
  posterPath: string | null;
};

type MediaCardProps = MediaCardItem & {
  showWatchlistButton?: boolean;
  initialInWatchlist?: boolean;
  onWatchlistToggle?: (inWatchlist: boolean) => void;
};

export const MediaCard = ({
  id,
  mediaType,
  title,
  year,
  posterPath,
  showWatchlistButton = false,
  initialInWatchlist = false,
  onWatchlistToggle,
}: MediaCardProps) => (
  <div className="group relative w-full">
    <Link
      href={`/${mediaType}/${id}`}
      className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-surface shadow-lg shadow-black/40 transition-transform duration-200 group-hover:scale-[1.03]">
        {posterPath ? (
          <Image
            src={`${TMDB_POSTER_BASE_URL}${posterPath}`}
            alt={title}
            fill
            sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-center text-xs text-subtle-foreground">
            No poster
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium">{title}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {year ?? "—"} · {mediaType === "movie" ? "Movie" : "TV Show"}
      </p>
    </Link>
    {showWatchlistButton && (
      <div className="absolute top-2 right-2">
        <WatchlistButton
          tmdbId={id}
          mediaType={mediaType}
          initialInWatchlist={initialInWatchlist}
          onToggle={onWatchlistToggle}
        />
      </div>
    )}
  </div>
);
