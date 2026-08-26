"use client";

import { useState } from "react";
import { MediaCard, type MediaCardItem } from "@/components/media-card";

type WatchlistGridProps = {
  initialItems: MediaCardItem[];
};

export const WatchlistGrid = ({ initialItems }: WatchlistGridProps) => {
  const [items, setItems] = useState(initialItems);

  const handleRemoved = (mediaType: "movie" | "tv", id: number) => {
    setItems((current) =>
      current.filter((item) => !(item.mediaType === mediaType && item.id === id)),
    );
  };

  if (items.length === 0) {
    return (
      <p className="mt-4 text-muted-foreground">
        Nothing on your watchlist yet.
      </p>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.id}`}
          {...item}
          showWatchlistButton
          initialInWatchlist
          onWatchlistToggle={(inWatchlist) => {
            if (!inWatchlist) handleRemoved(item.mediaType, item.id);
          }}
        />
      ))}
    </div>
  );
};
