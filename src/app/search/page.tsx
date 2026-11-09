"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { MediaCard, type MediaCardItem } from "@/components/media-card";
import { createClient } from "@/lib/supabase/client";
import { profileUrl } from "@/lib/tmdb/images";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { TmdbPersonSearchResponse, TmdbSearchResponse } from "@/lib/tmdb/types";

type PersonResult = { id: string; username: string; avatarUrl: string | null };
type ActorResult = { id: number; name: string; photo: string | null; knownFor: string[] };

type SearchMode = "titles" | "actors" | "members";

const MODES: { value: SearchMode; label: string }[] = [
  { value: "titles", label: "Titles" },
  { value: "actors", label: "Actors" },
  { value: "members", label: "Members" },
];

/** Old tab names keep working in links: `?mode=cast` (Actors) and `?mode=people` (Members). */
const parseMode = (value: string | null): SearchMode =>
  value === "actors" || value === "cast"
    ? "actors"
    : value === "members" || value === "people"
      ? "members"
      : "titles";

const SearchPageContent = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<SearchMode>(() => parseMode(searchParams.get("mode")));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [results, setResults] = useState<MediaCardItem[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set());

  const [personResults, setPersonResults] = useState<PersonResult[]>([]);
  const [searchedPeopleQuery, setSearchedPeopleQuery] = useState<string | null>(null);

  const [actorResults, setActorResults] = useState<ActorResult[]>([]);
  const [searchedActorQuery, setSearchedActorQuery] = useState<string | null>(null);

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
      if (mode !== "titles") params.set("mode", mode);
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
      } else if (mode === "actors") {
        try {
          const response = await fetch(
            `/api/tmdb/search?q=${encodeURIComponent(trimmedQuery)}&type=person`,
            { signal: controller.signal },
          );
          const data: TmdbPersonSearchResponse = await response.json();

          // Actor pages show acting credits only, so only actors are listed.
          setActorResults(
            (data.results ?? [])
              .filter((person) => person.known_for_department === "Acting")
              .map((person) => ({
                id: person.id,
                name: person.name,
                photo: profileUrl(person.profile_path),
                knownFor: (person.known_for ?? [])
                  .map((title) => title.title ?? title.name)
                  .filter((title): title is string => Boolean(title))
                  .slice(0, 3),
              })),
          );
          setSearchedActorQuery(trimmedQuery);
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            setActorResults([]);
            setSearchedActorQuery(trimmedQuery);
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

  const isActorPending = !showPrompt && searchedActorQuery !== trimmedQuery;
  const showNoActorResults = !showPrompt && !isActorPending && actorResults.length === 0;
  const showActorResults = !showPrompt && !isActorPending && actorResults.length > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <div className="mt-4 flex gap-1 rounded-md border border-border bg-surface p-1 w-fit">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`cursor-pointer rounded px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              mode === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-md">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={
            mode === "titles"
              ? "Search movies and TV shows..."
              : mode === "actors"
                ? "Search actors by name..."
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
      ) : mode === "actors" ? (
        <>
          {showPrompt && (
            <p className="mt-4 text-muted-foreground">
              Search for an actor by name to get started.
            </p>
          )}
          {isActorPending && <p className="mt-4 text-muted-foreground">Searching…</p>}
          {showNoActorResults && (
            <p className="mt-4 text-muted-foreground">
              No actors found for &ldquo;{trimmedQuery}&rdquo;.
            </p>
          )}
          {showActorResults && (
            <ul className="mt-4 flex max-w-md flex-col gap-1">
              {actorResults.map((actor) => (
                <li key={actor.id}>
                  <Link
                    href={`/actor/${actor.id}`}
                    className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-subtle-foreground">
                      {actor.photo ? (
                        <Image src={actor.photo} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <User className="size-5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-medium">{actor.name}</span>
                      {actor.knownFor.length > 0 && (
                        <span className="block truncate text-sm text-muted-foreground">
                          {actor.knownFor.join(", ")}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
