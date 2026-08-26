import Image from "next/image";
import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { LogMovieForm } from "@/components/log-movie-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ReviewList } from "@/components/review-list";
import { WatchlistButton } from "@/components/watchlist-button";
import { WatchedButton } from "@/components/watched-button";
import { fetchReviews } from "@/lib/reviews";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_PROFILE_BASE_URL = "https://image.tmdb.org/t/p/w185";

type MoviePageProps = {
  params: Promise<{ id: string }>;
};

const MoviePage = async ({ params }: MoviePageProps) => {
  const { id } = await params;
  const movieId = Number(id);

  if (!Number.isInteger(movieId) || movieId <= 0) {
    notFound();
  }

  let movie: TmdbMovieDetails;
  try {
    movie = await tmdbFetch<TmdbMovieDetails>(`/movie/${movieId}`, {
      append_to_response: "credits",
    });
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existingLog } = user
    ? await supabase
        .from("movie_logs")
        .select("rating, review, watched_date")
        .eq("user_id", user.id)
        .eq("tmdb_movie_id", movieId)
        .maybeSingle()
    : { data: null };

  const reviews = await fetchReviews(supabase, "movie_logs", {
    tmdb_movie_id: movieId,
  });

  const { data: watchlistEntry } = user
    ? await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", movieId)
        .eq("media_type", "movie")
        .maybeSingle()
    : { data: null };

  const cast = movie.credits.cast.slice(0, 10);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex gap-6">
        <div className="relative w-40 shrink-0 overflow-hidden rounded-md bg-surface">
          {movie.poster_path ? (
            <Image
              src={`${TMDB_POSTER_BASE_URL}${movie.poster_path}`}
              alt={movie.title}
              width={185}
              height={278}
              className="h-auto w-full"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-center text-xs text-subtle-foreground">
              No poster
            </div>
          )}
          {user && (
            <div className="absolute top-2 right-2">
              <WatchlistButton
                tmdbId={movieId}
                mediaType="movie"
                initialInWatchlist={watchlistEntry !== null}
              />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {movie.release_date?.slice(0, 4)}
            {movie.runtime ? ` · ${movie.runtime} min` : ""}
          </p>
          <p className="mt-3">{movie.overview}</p>
        </div>
      </div>

      {cast.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Cast</h2>
          <ul className="mt-2 flex flex-wrap gap-4">
            {cast.map((member) => (
              <li key={member.id} className="w-20 text-center text-xs">
                <div className="aspect-[2/3] w-20 overflow-hidden rounded bg-neutral-800">
                  {member.profile_path && (
                    <Image
                      src={`${TMDB_PROFILE_BASE_URL}${member.profile_path}`}
                      alt={member.name}
                      width={92}
                      height={138}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 font-medium">{member.name}</p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {member.character}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your log</h2>
          {user && (
            <WatchedButton
              tmdbId={movieId}
              mediaType="movie"
              initialIsWatched={existingLog !== null}
            />
          )}
        </div>
        {user ? (
          <LogMovieForm
            tmdbMovieId={movieId}
            initialLog={
              existingLog
                ? {
                    rating:
                      existingLog.rating === null
                        ? null
                        : Number(existingLog.rating),
                    review: existingLog.review,
                    watchedDate: existingLog.watched_date,
                  }
                : null
            }
          />
        ) : (
          <SignInPrompt />
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Reviews</h2>
        <ReviewList reviews={reviews} viewerId={user?.id ?? null} />
      </section>
    </main>
  );
};

export default MoviePage;
