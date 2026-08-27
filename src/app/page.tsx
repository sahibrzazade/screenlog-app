import Image from "next/image";
import Link from "next/link";
import { Bookmark, Film, Search, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { tmdbFetch } from "@/lib/tmdb/client";
import { getWatchlistItems } from "@/lib/watchlist";
import { getDiaryData } from "@/lib/diary";
import { MediaCard } from "@/components/media-card";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";

const Home = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [popularMovies, popularShows, watchlistItems, diaryData, profile] =
    await Promise.all([
      tmdbFetch<TmdbSearchResponse>("/movie/popular"),
      tmdbFetch<TmdbSearchResponse>("/tv/popular"),
      user ? getWatchlistItems(supabase, user.id) : Promise.resolve([]),
      user
        ? getDiaryData(supabase, user.id)
        : Promise.resolve({ movies: [], shows: [] }),
      user
        ? supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single()
            .then(({ data }) => data)
        : Promise.resolve(null),
    ]);

  const watchlistKeys = new Set(
    watchlistItems.map((item) => `${item.mediaType}-${item.id}`),
  );
  const continueWatchlistItems = watchlistItems.slice(0, 6);

  const heroBackdrop =
    popularMovies.results.find((result) => result.backdrop_path)
      ?.backdrop_path ?? null;

  const movieItems = popularMovies.results
    .slice(0, 12)
    .map((result) => toMediaCardItem(result, "movie"));
  const showItems = popularShows.results
    .slice(0, 12)
    .map((result) => toMediaCardItem(result, "tv"));

  return (
    <main>
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden border-b border-border">
        {heroBackdrop && (
          <>
            <Image
              src={`${TMDB_BACKDROP_BASE_URL}${heroBackdrop}`}
              alt=""
              fill
              priority
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          </>
        )}

        <div className="relative mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="font-display text-5xl text-foreground italic sm:text-6xl">
            {profile?.username ? `Welcome back, ${profile.username}` : "Screenlog"}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {profile?.username
              ? "Here's what's popular right now."
              : "Track every movie and show you watch. Rate it, review it, remember it."}
          </p>

          {user && (
            <dl className="mt-6 flex items-center justify-center gap-6 font-mono text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Film aria-hidden="true" className="size-4" />
                <dt className="sr-only">Films logged</dt>
                <dd>{diaryData.movies.length} films</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Tv aria-hidden="true" className="size-4" />
                <dt className="sr-only">Shows logged</dt>
                <dd>{diaryData.shows.length} shows</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Bookmark aria-hidden="true" className="size-4" />
                <dt className="sr-only">On your watchlist</dt>
                <dd>{watchlistItems.length} watchlist</dd>
              </div>
            </dl>
          )}

          <form action="/search" className="relative mx-auto mt-8 max-w-md">
            <label htmlFor="home-search" className="sr-only">
              Search movies and TV shows
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              id="home-search"
              type="search"
              name="q"
              placeholder="Search movies and TV shows..."
              className="w-full rounded-md border border-border bg-surface py-2.5 pr-3 pl-9 text-foreground placeholder:text-subtle-foreground focus:border-accent focus:outline-none"
            />
          </form>

          {!user && (
            <p className="mt-6 text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-accent hover:text-accent-hover"
              >
                Log in
              </Link>{" "}
              or{" "}
              <Link
                href="/signup"
                className="text-accent hover:text-accent-hover"
              >
                sign up
              </Link>{" "}
              to start logging what you watch.
            </p>
          )}
        </div>
      </section>

      {continueWatchlistItems.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              Pick up where you left off
            </h2>
            <Link
              href="/watchlist"
              className="text-sm text-accent hover:text-accent-hover"
            >
              See all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {continueWatchlistItems.map((item) => (
              <MediaCard
                key={`${item.mediaType}-${item.id}`}
                {...item}
                showWatchlistButton
                initialInWatchlist
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-xl font-semibold">Popular movies</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movieItems.map((item) => (
            <MediaCard
              key={`movie-${item.id}`}
              {...item}
              showWatchlistButton={user !== null}
              initialInWatchlist={watchlistKeys.has(`movie-${item.id}`)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="text-xl font-semibold">Popular TV shows</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {showItems.map((item) => (
            <MediaCard
              key={`tv-${item.id}`}
              {...item}
              showWatchlistButton={user !== null}
              initialInWatchlist={watchlistKeys.has(`tv-${item.id}`)}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;
