import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { LogMovieForm } from "@/components/log-movie-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { ReviewList } from "@/components/review-list";
import { DetailBackdrop } from "@/components/detail/detail-backdrop";
import { DetailPoster } from "@/components/detail/detail-poster";
import { GenreBadges } from "@/components/detail/genre-badges";
import { CastList } from "@/components/detail/cast-list";
import { MoreLikeThis } from "@/components/detail/more-like-this";
import { TmdbRating } from "@/components/detail/tmdb-rating";
import { fetchReviews } from "@/lib/reviews";
import { fetchOwnLog, isOnWatchlist } from "@/lib/logs/queries";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import type { TmdbMovieDetails } from "@/lib/tmdb/types";

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
      append_to_response: "credits,recommendations",
    });
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const existingLog = await fetchOwnLog(
    supabase,
    user,
    "movie_logs",
    "tmdb_movie_id",
    movieId,
  );

  const reviews = await fetchReviews(supabase, "movie_logs", {
    tmdb_movie_id: movieId,
  });

  const inWatchlist = await isOnWatchlist(supabase, user, movieId, "movie");

  const cast = movie.credits.cast.slice(0, 10);
  const directors = movie.credits.crew
    .filter((member) => member.job === "Director")
    .map((member) => member.name)
    .join(", ");
  const similar = movie.recommendations.results.slice(0, 12);
  const poster = posterUrl(movie.poster_path);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <DetailBackdrop url={backdropUrl(movie.backdrop_path)} />
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex w-48 shrink-0 flex-col gap-4 self-center sm:sticky sm:top-20 sm:self-start">
          <DetailPoster
            url={poster}
            alt={movie.title}
            watchlist={
              user
                ? { tmdbId: movieId, mediaType: "movie", inWatchlist }
                : undefined
            }
          />
          {user ? (
            <LogMovieForm
              tmdbMovieId={movieId}
              title={movie.title}
              posterUrl={poster}
              initialLog={existingLog}
            />
          ) : (
            <SignInPrompt />
          )}
          <GenreBadges genres={movie.genres} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{movie.title}</h1>
          {movie.tagline && (
            <p className="mt-1 text-sm text-muted-foreground italic">
              {movie.tagline}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              {movie.release_date?.slice(0, 4)}
              {movie.runtime ? ` · ${movie.runtime} min` : ""}
            </span>
            <TmdbRating
              voteAverage={movie.vote_average}
              voteCount={movie.vote_count}
            />
          </p>
          {directors && (
            <p className="mt-2 text-sm text-muted-foreground">
              Directed by <span className="text-foreground">{directors}</span>
            </p>
          )}
          <p className="mt-3">{movie.overview}</p>

          <CastList cast={cast} />

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Reviews</h2>
            <ReviewList reviews={reviews} viewerId={user?.id ?? null} />
          </section>

          <MoreLikeThis items={similar} mediaType="movie" />
        </div>
      </div>
    </main>
  );
};

export default MoviePage;
