"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptySlot, PosterTile } from "@/components/poster-tile";
import { SearchPickerPanel } from "@/components/search-picker-panel";
import { updateNowWatching, type UpdateShowcaseState } from "@/app/settings/actions";
import type { MediaCardItem } from "@/components/media-card";

type NowWatchingPickerProps = {
  initialItem: MediaCardItem | null;
};

/** Same card UI as the top-4 showcase, but a single slot with no drag/reorder. */
export const NowWatchingPicker = ({ initialItem }: NowWatchingPickerProps) => {
  const [item, setItem] = useState(initialItem);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [state, formAction] = useActionState<UpdateShowcaseState, FormData>(
    updateNowWatching,
    undefined,
  );
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && "success" in state) toast.success("Currently watching updated");
  }, [state]);

  useEffect(() => {
    if (isPickerOpen) pickerRef.current?.focus();
  }, [isPickerOpen]);

  const persist = (next: MediaCardItem | null) => {
    setItem(next);
    setIsPickerOpen(false);
    const formData = new FormData();
    formData.set("nowWatchingShowId", next ? String(next.id) : "");
    startTransition(() => formAction(formData));
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Currently watching</h3>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

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
