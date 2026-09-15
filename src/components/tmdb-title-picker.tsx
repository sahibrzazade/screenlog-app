"use client";

import { forwardRef, useEffect, useState } from "react";
import Image from "next/image";
import { SearchBar } from "@/components/search-bar";
import { posterUrl } from "@/lib/tmdb/images";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { MediaCardItem } from "@/components/media-card";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

type TmdbTitlePickerProps = {
  mediaType: "movie" | "tv";
  /** Ids already picked elsewhere in this list — shown but not selectable. */
  excludeIds?: number[];
  disabled?: boolean;
  placeholder?: string;
  onSelect: (item: MediaCardItem) => void;
};

/**
 * Reusable TMDB search-and-pick control: debounced search restricted to one
 * media type, results as a compact clickable list. The caller owns what
 * happens on pick (add to a list, set a single value, etc.) — this component
 * only searches and reports the choice. Forwards a ref to the search input so
 * callers can focus it programmatically (e.g. a "+" button elsewhere).
 */
export const TmdbTitlePicker = forwardRef<HTMLInputElement, TmdbTitlePickerProps>(
  ({ mediaType, excludeIds = [], disabled = false, placeholder, onSelect }, ref) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MediaCardItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const trimmedQuery = query.trim();

    useEffect(() => {
      if (!trimmedQuery) return;

      const controller = new AbortController();

      const timeout = setTimeout(async () => {
        setIsSearching(true);
        try {
          const response = await fetch(
            `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=${mediaType}`,
            { signal: controller.signal },
          );
          const data: TmdbSearchResponse = await response.json();
          setResults((data.results ?? []).map((result) => toMediaCardItem(result, mediaType)));
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            setResults([]);
          }
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => {
        clearTimeout(timeout);
        controller.abort();
      };
    }, [trimmedQuery, mediaType]);

    return (
      <div className="flex flex-col gap-2">
        <SearchBar ref={ref} value={query} onChange={setQuery} placeholder={placeholder} />
        {isSearching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!isSearching && trimmedQuery && results.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-md border border-border bg-surface p-1">
            {results.map((item) => {
              const alreadyPicked = excludeIds.includes(item.id);
              const poster = posterUrl(item.posterPath, "w154");

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled || alreadyPicked}
                    onClick={() => onSelect(item)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded p-1.5 text-left transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-background">
                      {poster && (
                        <Image src={poster} alt="" fill sizes="32px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.year ?? "—"}
                        {alreadyPicked ? " · Already picked" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);

TmdbTitlePicker.displayName = "TmdbTitlePicker";
