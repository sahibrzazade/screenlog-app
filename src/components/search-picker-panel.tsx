"use client";

import { forwardRef } from "react";
import { X } from "lucide-react";
import { TmdbTitlePicker } from "@/components/tmdb-title-picker";
import type { MediaCardItem } from "@/components/media-card";

type MediaType = "movie" | "tv";

const MEDIA_TYPE_OPTIONS = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "Shows" },
] as const;

type SearchPickerPanelProps = {
  mediaType: MediaType;
  /** Lets the user switch what's searched: shows a Movies / Shows toggle in the header. */
  onMediaTypeChange?: (mediaType: MediaType) => void;
  excludeIds?: number[];
  onSelect: (item: MediaCardItem) => void;
  onClose: () => void;
};

/** A `TmdbTitlePicker` wrapped in a closable panel — a small header with an X to dismiss it. */
export const SearchPickerPanel = forwardRef<HTMLInputElement, SearchPickerPanelProps>(
  ({ mediaType, onMediaTypeChange, excludeIds, onSelect, onClose }, ref) => {
    const typeLabel = mediaType === "movie" ? "movies" : "TV shows";

    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2">
        <div className="flex items-center justify-between gap-2">
          {onMediaTypeChange ? (
            <div role="group" aria-label="Search in" className="flex gap-1 rounded-md border border-border p-0.5">
              {MEDIA_TYPE_OPTIONS.map(({ value, label }) => {
                const active = value === mediaType;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onMediaTypeChange(value)}
                    aria-pressed={active}
                    className={`cursor-pointer rounded px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "bg-surface-elevated text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Search {typeLabel}</span>
          )}
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
