"use client";

import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { EmptySlot, PosterTile } from "@/components/poster-tile";
import { SearchPickerPanel } from "@/components/search-picker-panel";
import { updateNowWatching } from "@/app/settings/actions";
import type { MediaCardItem } from "@/components/media-card";
import { saveShowcase } from "@/lib/save-showcase";

type NowWatchingPickerProps = {
  /** The saved show; revalidated after each successful save. */
  initialItem: MediaCardItem | null;
};

/**
 * Same card UI as the top-4 showcase, but a single slot with no drag/reorder.
 * Changes show optimistically: if saving fails, the transition ending puts
 * the saved show back.
 */
export const NowWatchingPicker = ({ initialItem }: NowWatchingPickerProps) => {
  const [item, setOptimisticItem] = useOptimistic(initialItem);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPickerOpen) pickerRef.current?.focus();
  }, [isPickerOpen]);

  const persist = (next: MediaCardItem | null) => {
    setIsPickerOpen(false);
    const formData = new FormData();
    formData.set("nowWatchingShowId", next ? String(next.id) : "");
    startTransition(async () => {
      setOptimisticItem(next);
      await saveShowcase(updateNowWatching, formData, "Currently watching updated");
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Currently watching</h3>

      <div className="w-24">
        {item ? (
          <PosterTile
            title={item.title}
            posterPath={item.posterPath}
            onRemove={() => persist(null)}
          />
        ) : (
          <EmptySlot label="Add a TV show" onClick={() => setIsPickerOpen(true)} />
        )}
      </div>

      {isPickerOpen && !item && (
        <SearchPickerPanel
          ref={pickerRef}
          mediaType="tv"
          onSelect={(picked) => persist(picked)}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};
