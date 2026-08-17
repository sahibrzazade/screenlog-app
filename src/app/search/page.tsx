"use client";

import { useEffect, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { MediaCard, type MediaCardItem } from "@/components/media-card";
import type { TmdbSearchResponse, TmdbSearchResult } from "@/lib/tmdb/types";

const toMediaCardItems = (
  results: TmdbSearchResult[],
  mediaType: "movie" | "tv",
): MediaCardItem[] =>
  results.map((result) => ({
    id: result.id,
    mediaType,
    title: (mediaType === "movie" ? result.title : result.name) ?? "Untitled",
    year:
      (mediaType === "movie" ? result.release_date : result.first_air_date)?.slice(0, 4) ||
      null,
    posterPath: result.poster_path,
  }));

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=movie`, {
            signal: controller.signal,
          }),
          fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=tv`, {
            signal: controller.signal,
          }),
        ]);
        const [movieData, tvData]: [TmdbSearchResponse, TmdbSearchResponse] = await Promise.all([
          movieResponse.json(),
          tvResponse.json(),
        ]);

        setResults([
          ...toMediaCardItems(movieData.results ?? [], "movie"),
          ...toMediaCardItems(tvData.results ?? [], "tv"),
        ]);
        setSearchedQuery(trimmedQuery);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setSearchedQuery(trimmedQuery);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  const showPrompt = trimmedQuery === "";
  const isPending = !showPrompt && searchedQuery !== trimmedQuery;
  const showNoResults = !showPrompt && !isPending && results.length === 0;
  const showGrid = !showPrompt && !isPending && results.length > 0;

  return (
    <main>
      <h1>Search</h1>
      <SearchBar value={query} onChange={setQuery} />
      {showPrompt && (
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Search for a movie or TV show to get started.
        </p>
      )}
      {isPending && <p className="mt-4">Searching…</p>}
      {showNoResults && (
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          No results found for &ldquo;{trimmedQuery}&rdquo;. Try a different title.
        </p>
      )}
      {showGrid && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <MediaCard key={`${item.mediaType}-${item.id}`} {...item} />
          ))}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
