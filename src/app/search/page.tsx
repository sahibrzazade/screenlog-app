"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { MediaCard, type MediaCardItem } from "@/components/media-card";
import type { TmdbSearchResponse, TmdbSearchResult } from "@/lib/tmdb/types";

const toMediaCardItem = (
  result: TmdbSearchResult,
  mediaType: "movie" | "tv",
): MediaCardItem => ({
  id: result.id,
  mediaType,
  title: (mediaType === "movie" ? result.title : result.name) ?? "Untitled",
  year:
    (mediaType === "movie" ? result.release_date : result.first_air_date)?.slice(0, 4) || null,
  posterPath: result.poster_path,
});

const SearchPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      if (new URLSearchParams(window.location.search).has("q")) {
        router.replace(pathname, { scroll: false });
      }
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      const params = new URLSearchParams(window.location.search);
      params.set("q", trimmedQuery);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

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

        const ranked = [
          ...(movieData.results ?? []).map((result) => ({ result, mediaType: "movie" as const })),
          ...(tvData.results ?? []).map((result) => ({ result, mediaType: "tv" as const })),
        ].sort((a, b) => (b.result.popularity ?? 0) - (a.result.popularity ?? 0));

        setResults(ranked.map(({ result, mediaType }) => toMediaCardItem(result, mediaType)));
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
  }, [trimmedQuery, pathname, router]);

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

const SearchPage = () => (
  <Suspense fallback={<main><h1>Search</h1></main>}>
    <SearchPageContent />
  </Suspense>
);

export default SearchPage;
