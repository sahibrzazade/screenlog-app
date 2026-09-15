"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search-bar";
import { MediaCard, type MediaCardItem } from "@/components/media-card";
import { createClient } from "@/lib/supabase/client";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

type PersonResult = { id: string; username: string; avatarUrl: string | null };

const SearchPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"titles" | "people">(() =>
    searchParams.get("mode") === "people" ? "people" : "titles",
  );
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set());

  const [personResults, setPersonResults] = useState<PersonResult[]>([]);
  const [searchedPeopleQuery, setSearchedPeopleQuery] = useState<string | null>(null);

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

  // One debounced effect drives both modes: it keeps `q` + `mode` in the URL
  // (so a search is shareable/refreshable) and fetches for whichever mode is
  // active. State is only ever set inside the timeout callback (an async
  // boundary), never synchronously in the effect body — react-hooks/set-state-in-effect
  // flags the latter, hit earlier elsewhere in this app for the same reason.
  useEffect(() => {
    if (!trimmedQuery) {
      if (new URLSearchParams(window.location.search).has("q")) {
        router.replace(pathname, { scroll: false });
      }
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      params.set("q", trimmedQuery);
      if (mode === "people") params.set("mode", "people");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      if (mode === "titles") {
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
      } else {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles_public")
          .select("id, username, avatar_url")
          .ilike("username", `%${trimmedQuery}%`)
          .limit(20);

        setPersonResults(
          (data ?? []).map((row) => ({
            id: row.id,
            username: row.username,
            avatarUrl: row.avatar_url,
          })),
        );
        setSearchedPeopleQuery(trimmedQuery);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery, mode, pathname, router]);

  const showPrompt = trimmedQuery === "";
  const isPending = !showPrompt && searchedQuery !== trimmedQuery;
  const showNoResults = !showPrompt && !isPending && results.length === 0;
  const showGrid = !showPrompt && !isPending && results.length > 0;

  const isPeoplePending = !showPrompt && searchedPeopleQuery !== trimmedQuery;
  const showNoPeopleResults = !showPrompt && !isPeoplePending && personResults.length === 0;
  const showPeopleResults = !showPrompt && !isPeoplePending && personResults.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <div className="mt-4 flex gap-1 rounded-md border border-border bg-surface p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("titles")}
          className={`cursor-pointer rounded px-3 py-1 text-sm transition-colors ${
            mode === "titles"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Titles
        </button>
        <button
          type="button"
          onClick={() => setMode("people")}
          className={`cursor-pointer rounded px-3 py-1 text-sm transition-colors ${
            mode === "people"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          People
        </button>
      </div>

      <div className="mt-4 max-w-md">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={
            mode === "titles"
              ? "Search movies and TV shows..."
              : "Search by username..."
          }
        />
      </div>

      {mode === "titles" ? (
        <>
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
        </>
      ) : (
        <>
          {showPrompt && (
            <p className="mt-4 text-muted-foreground">
              Search for a user by username to get started.
            </p>
          )}
          {isPeoplePending && (
            <p className="mt-4 text-muted-foreground">Searching…</p>
          )}
          {showNoPeopleResults && (
            <p className="mt-4 text-muted-foreground">
              No users found for &ldquo;{trimmedQuery}&rdquo;.
            </p>
          )}
          {showPeopleResults && (
            <ul className="mt-4 flex max-w-md flex-col gap-1">
              {personResults.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/user/${person.username}`}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-surface">
                      <Image
                        src={person.avatarUrl || "/default-avatar.png"}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <span className="font-medium">{person.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
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
