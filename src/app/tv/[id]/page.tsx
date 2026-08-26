import Image from "next/image";
import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { LogShowForm } from "@/components/log-show-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { SeasonList, type SeasonLogSummary } from "@/components/season-list";
import { ReviewList } from "@/components/review-list";
import { WatchlistButton } from "@/components/watchlist-button";
import { WatchedButton } from "@/components/watched-button";
import { fetchReviews, fetchSeasonReviewsByNumber } from "@/lib/reviews";
import type { TmdbShowDetails } from "@/lib/tmdb/types";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_PROFILE_BASE_URL = "https://image.tmdb.org/t/p/w185";

type ShowPageProps = {
  params: Promise<{ id: string }>;
};

const ShowPage = async ({ params }: ShowPageProps) => {
  const { id } = await params;
  const showId = Number(id);

  if (!Number.isInteger(showId) || showId <= 0) {
    notFound();
  }

  let show: TmdbShowDetails;
  try {
    show = await tmdbFetch<TmdbShowDetails>(`/tv/${showId}`, {
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
        .from("show_logs")
        .select("rating, review, watched_date")
        .eq("user_id", user.id)
        .eq("tmdb_show_id", showId)
        .maybeSingle()
    : { data: null };

  const cast = show.credits.cast.slice(0, 10);

  const { data: existingSeasonLogs } = user
    ? await supabase
        .from("season_logs")
        .select("season_number, rating, review, watched_date")
        .eq("user_id", user.id)
        .eq("tmdb_show_id", showId)
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

  const showReviews = await fetchReviews(supabase, "show_logs", {
    tmdb_show_id: showId,
  });
  const seasonReviewsByNumber = await fetchSeasonReviewsByNumber(
    supabase,
    showId,
  );

  const { data: watchlistEntry } = user
    ? await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("tmdb_id", showId)
        .eq("media_type", "tv")
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="relative w-40 shrink-0 overflow-hidden rounded-md bg-surface">
          {show.poster_path ? (
            <Image
              src={`${TMDB_POSTER_BASE_URL}${show.poster_path}`}
              alt={show.name}
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
                tmdbId={showId}
                mediaType="tv"
                initialInWatchlist={watchlistEntry !== null}
              />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <p className="text-sm text-muted-foreground">
            {show.first_air_date?.slice(0, 4)}
            {show.number_of_seasons
              ? ` · ${show.number_of_seasons} season${show.number_of_seasons === 1 ? "" : "s"}`
              : ""}
          </p>
          <p className="mt-3">{show.overview}</p>
        </div>
      </div>

      {cast.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Cast</h2>
          <ul className="mt-2 flex flex-wrap gap-4">
            {cast.map((member) => (
              <li key={member.id} className="w-20 text-center text-xs">
                <div className="aspect-[2/3] w-20 overflow-hidden rounded bg-surface">
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
                <p className="text-muted-foreground">
                  {member.character}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {show.seasons.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Seasons</h2>
          <SeasonList
            tmdbShowId={showId}
            seasons={show.seasons}
            existingLogs={seasonLogsByNumber}
            reviewsBySeason={seasonReviewsByNumber}
            viewerId={user?.id ?? null}
            canLog={user !== null}
          />
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your rating</h2>
          {user && (
            <WatchedButton
              tmdbId={showId}
              mediaType="tv"
              initialIsWatched={existingLog !== null}
            />
          )}
        </div>
        {user ? (
          <LogShowForm
            tmdbShowId={showId}
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
        <ReviewList reviews={showReviews} viewerId={user?.id ?? null} />
      </section>
    </main>
  );
};

export default ShowPage;
