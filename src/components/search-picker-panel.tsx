"use client";

import { forwardRef } from "react";
import { X } from "lucide-react";
import { TmdbTitlePicker } from "@/components/tmdb-title-picker";
import type { MediaCardItem } from "@/components/media-card";

type SearchPickerPanelProps = {
  mediaType: "movie" | "tv";
  excludeIds?: number[];
  onSelect: (item: MediaCardItem) => void;
  onClose: () => void;
};

/** A `TmdbTitlePicker` wrapped in a closable panel — a small header with an X to dismiss it. */
export const SearchPickerPanel = forwardRef<HTMLInputElement, SearchPickerPanelProps>(
  ({ mediaType, excludeIds, onSelect, onClose }, ref) => {
    const typeLabel = mediaType === "movie" ? "movies" : "TV shows";

    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Search {typeLabel}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <TmdbTitlePicker
          ref={ref}
          mediaType={mediaType}
          excludeIds={excludeIds}
          onSelect={onSelect}
          placeholder={`Search ${typeLabel}...`}
        />
      </div>
    );
  },
);

SearchPickerPanel.displayName = "SearchPickerPanel";
