import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { AddToListButton } from "@/components/add-to-list-button";
import { LogShowForm } from "@/components/log-show-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { SeasonList, type SeasonLogSummary } from "@/components/season-list";
import { ReviewsSection } from "@/components/reviews-section";
import { DetailBackdrop } from "@/components/detail/detail-backdrop";
import { DetailPoster } from "@/components/detail/detail-poster";
import { GenreBadges } from "@/components/detail/genre-badges";
import { CastList } from "@/components/detail/cast-list";
import { MoreLikeThis } from "@/components/detail/more-like-this";
import { TmdbRating } from "@/components/detail/tmdb-rating";
import { FriendsWhoWatched } from "@/components/detail/friends-who-watched";
import { getFriendsWhoWatched } from "@/lib/friends-who-watched";
import { fetchReviews } from "@/lib/reviews";
import { parseReviewSort } from "@/lib/review-sort";
import { fetchOwnShowLog, isOnWatchlist } from "@/lib/logs/queries";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import type { TmdbShowDetails } from "@/lib/tmdb/types";

type ShowPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reviews?: string | string[] }>;
};

const ShowPage = async ({ params, searchParams }: ShowPageProps) => {
  const { id } = await params;
  const reviewSort = parseReviewSort((await searchParams).reviews);
  const showId = Number(id);

  if (!Number.isInteger(showId) || showId <= 0) {
    notFound();
  }

  let show: TmdbShowDetails;
  try {
    show = await tmdbFetch<TmdbShowDetails>(`/tv/${showId}`, {
      append_to_response: "credits,recommendations",
    });
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const existingLog = await fetchOwnShowLog(supabase, user, showId);

  const cast = show.credits.cast.slice(0, 10);

  const { data: existingSeasonLogs } = user
    ? await supabase
        .from("season_logs")
        .select("season_number, rating, review, watched_date")
        .eq("user_id", user.id)
        .eq("tmdb_show_id", showId)
        // Oldest first, so each season's latest watch is the one
        // Object.fromEntries keeps (a season can be logged more than once).
        .order("watched_date", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: null };

  const seasonLogsByNumber: Record<number, SeasonLogSummary> =
    Object.fromEntries(
      (existingSeasonLogs ?? []).map((log) => [
        log.season_number,
        {
          rating: log.rating === null ? null : Number(log.rating),
          review: log.review,
          watchedDate: log.watched_date,
        },
      ]),
    );

  const showReviews = await fetchReviews(
    supabase,
    "show_logs",
    { tmdb_show_id: showId },
    user?.id ?? null,
  );

  const friends = await getFriendsWhoWatched(
    supabase,
    "show_logs",
    { tmdb_show_id: showId },
    user?.id ?? null,
  );

  const inWatchlist = await isOnWatchlist(supabase, user, showId, "tv");

  const creators = show.created_by.map((creator) => creator.name).join(", ");
  const similar = show.recommendations.results.slice(0, 12);
  const poster = posterUrl(show.poster_path);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <DetailBackdrop url={backdropUrl(show.backdrop_path)} />
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex w-48 shrink-0 flex-col gap-4 self-center sm:sticky sm:top-20 sm:self-start">
          <DetailPoster
            url={poster}
            alt={show.name}
            watchlist={
              user ? { tmdbId: showId, mediaType: "tv", inWatchlist } : undefined
            }
          />
          {user ? (
            <LogShowForm
              tmdbShowId={showId}
              title={show.name}
              posterUrl={poster}
              initialLog={existingLog}
            />
          ) : (
            <SignInPrompt />
          )}
          {user && (
            <AddToListButton tmdbId={showId} mediaType="tv" title={show.name} viewerId={user.id} />
          )}
          <GenreBadges genres={show.genres} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          {show.tagline && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground italic">
              {show.tagline}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>
              {show.first_air_date?.slice(0, 4)}
              {show.number_of_seasons
                ? ` · ${show.number_of_seasons} season${show.number_of_seasons === 1 ? "" : "s"}`
                : ""}
            </span>
            <TmdbRating
              voteAverage={show.vote_average}
              voteCount={show.vote_count}
            />
          </p>
          {creators && (
            <p className="mt-2 text-sm text-muted-foreground">
              Created by <span className="text-foreground">{creators}</span>
            </p>
          )}
          <p className="mt-3 max-w-2xl">{show.overview}</p>

          <CastList cast={cast} />

          {show.seasons.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Seasons</h2>
              <SeasonList
                tmdbShowId={showId}
                seasons={show.seasons}
                existingLogs={seasonLogsByNumber}
              />
            </section>
          )}

          <FriendsWhoWatched friends={friends} />

          <ReviewsSection
            reviews={showReviews}
            viewerId={user?.id ?? null}
            sort={reviewSort}
            basePath={`/tv/${showId}`}
          />

          <MoreLikeThis items={similar} mediaType="tv" />
        </div>
      </div>
    </main>
  );
};

export default ShowPage;
