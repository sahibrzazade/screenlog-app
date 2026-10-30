import { MediaCard, type MediaCardItem } from "@/components/media-card";

type MediaRowProps = {
  items: MediaCardItem[];
  userId: string | null;
  watchlistKeys: Set<string>;
  emptyMessage?: string;
};

/**
 * Horizontally-scrolling poster row, shared by every "list of movies/shows"
 * section on the home page so they read as one consistent pattern instead
 * of repeated full-width grids stacked on top of each other.
 */
export const MediaRow = ({ items, userId, watchlistKeys, emptyMessage }: MediaRowProps) => {
  if (items.length === 0) {
    return emptyMessage ? (
      <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
      {items.map((item) => (
        <div
          key={`${item.mediaType}-${item.id}`}
          className="w-28 shrink-0 sm:w-32 md:w-36"
        >
          <MediaCard
            {...item}
            showWatchlistButton={userId !== null}
            initialInWatchlist={watchlistKeys.has(`${item.mediaType}-${item.id}`)}
          />
        </div>
      ))}
    </div>
  );
};
