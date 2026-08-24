"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { MediaCard, type MediaCardItem } from "@/components/media-card";
import { createClient } from "@/lib/supabase/client";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

const SearchPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set());

  const trimmedQuery = query.trim();

  useEffect(() => {
    const supabase = createClient();

    const loadUserAndWatchlist = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      if (!user) {
        setWatchlistKeys(new Set());
        return;
      }

      const { data } = await supabase
        .from("watchlist")
        .select("tmdb_id, media_type")
        .eq("user_id", user.id);

      setWatchlistKeys(
        new Set((data ?? []).map((row) => `${row.media_type}-${row.tmdb_id}`)),
      );
    };

    loadUserAndWatchlist();
  }, []);

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
          fetch(
            `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=movie`,
            {
              signal: controller.signal,
            },
          ),
          fetch(
            `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=tv`,
            {
              signal: controller.signal,
            },
          ),
        ]);
        const [movieData, tvData]: [TmdbSearchResponse, TmdbSearchResponse] =
          await Promise.all([movieResponse.json(), tvResponse.json()]);

        const ranked = [
          ...(movieData.results ?? []).map((result) => ({
            result,
            mediaType: "movie" as const,
          })),
          ...(tvData.results ?? []).map((result) => ({
            result,
            mediaType: "tv" as const,
          })),
        ].sort(
          (a, b) => (b.result.popularity ?? 0) - (a.result.popularity ?? 0),
        );

        setResults(
          ranked.map(({ result, mediaType }) =>
            toMediaCardItem(result, mediaType),
          ),
        );
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
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <div className="mt-4 max-w-md">
        <SearchBar value={query} onChange={setQuery} />
      </div>
      {showPrompt && (
        <p className="mt-4 text-muted-foreground">
          Search for a movie or TV show to get started.
        </p>
      )}
      {isPending && <p className="mt-4 text-muted-foreground">Searching…</p>}
      {showNoResults && (
        <p className="mt-4 text-muted-foreground">
          No results found for &ldquo;{trimmedQuery}&rdquo;. Try a different
          title.
        </p>
      )}
      {showGrid && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item) => (
            <MediaCard
              key={`${item.mediaType}-${item.id}`}
              {...item}
              showWatchlistButton={userId !== null}
              initialInWatchlist={watchlistKeys.has(
                `${item.mediaType}-${item.id}`,
              )}
            />
          ))}
        </div>
      )}
    </main>
  );
};

const SearchPage = () => (
  <Suspense
    fallback={
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Search</h1>
      </main>
    }
  >
    <SearchPageContent />
  </Suspense>
);

export default SearchPage;
