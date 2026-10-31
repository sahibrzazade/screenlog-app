"use client";

import { useState } from "react";
import { MediaCard, type MediaCardItem } from "@/components/media-card";

type WatchlistGridProps = {
  initialItems: MediaCardItem[];
  /** Owner view: each card gets a remove-from-watchlist button. Visitors get a read-only grid. */
  editable?: boolean;
  emptyMessage?: string;
};

export const WatchlistGrid = ({
  initialItems,
  editable = false,
  emptyMessage = "Nothing on your watchlist yet.",
}: WatchlistGridProps) => {
  const [items, setItems] = useState(initialItems);

  const handleRemoved = (mediaType: "movie" | "tv", id: number) => {
    setItems((current) =>
      current.filter((item) => !(item.mediaType === mediaType && item.id === id)),
    );
  };

  if (items.length === 0) {
    return (
      <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.id}`}
          {...item}
          showWatchlistButton={editable}
          initialInWatchlist
          onWatchlistToggle={(inWatchlist) => {
            if (!inWatchlist) handleRemoved(item.mediaType, item.id);
          }}
        />
      ))}
    </div>
  );
};
