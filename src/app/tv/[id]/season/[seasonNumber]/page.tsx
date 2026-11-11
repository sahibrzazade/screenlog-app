import Link from "next/link";
import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { LogSeasonForm } from "@/components/log-season-form";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { EpisodeList } from "@/components/detail/episode-list";
import { DetailPoster } from "@/components/detail/detail-poster";
import { ReviewsSection } from "@/components/reviews-section";
import { FriendsWhoWatched } from "@/components/detail/friends-who-watched";
import { getFriendsWhoWatched } from "@/lib/friends-who-watched";
import { fetchReviews } from "@/lib/reviews";
import { fetchOwnWatches } from "@/lib/logs/queries";
import { parseReviewSort } from "@/lib/review-sort";
import { posterUrl } from "@/lib/tmdb/images";
import type { TmdbSeasonDetails } from "@/lib/tmdb/types";

type SeasonPageProps = {
  params: Promise<{ id: string; seasonNumber: string }>;
  searchParams: Promise<{ reviews?: string | string[] }>;
};

const SeasonPage = async ({ params, searchParams }: SeasonPageProps) => {
  const { id, seasonNumber: seasonNumberParam } = await params;
  const reviewSort = parseReviewSort((await searchParams).reviews);
  const showId = Number(id);
  const seasonNumber = Number(seasonNumberParam);

  if (
    !Number.isInteger(showId) ||
    showId <= 0 ||
    !Number.isInteger(seasonNumber) ||
    seasonNumber < 0
  ) {
    notFound();
  }

  let show: { name: string };
  let season: TmdbSeasonDetails;
  try {
    [show, season] = await Promise.all([
      tmdbFetch<{ name: string }>(`/tv/${showId}`),
      tmdbFetch<TmdbSeasonDetails>(`/tv/${showId}/season/${seasonNumber}`),
    ]);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const watches = await fetchOwnWatches(supabase, user, "season_logs", {
    tmdb_show_id: showId,
    season_number: seasonNumber,
  });

  const reviews = await fetchReviews(
    supabase,
    "season_logs",
    { tmdb_show_id: showId, season_number: seasonNumber },
    user?.id ?? null,
  );

  const friends = await getFriendsWhoWatched(
    supabase,
    "season_logs",
    { tmdb_show_id: showId, season_number: seasonNumber },
    user?.id ?? null,
  );

  const poster = posterUrl(season.poster_path);

  // Rendered beside the poster on phones and atop the main column from `sm` up.
  const header = (
    <>
      <h1 className="text-xl font-semibold text-balance sm:text-2xl">{season.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {show.name}
        {season.air_date ? ` · ${season.air_date.slice(0, 4)}` : ""}
        {` · ${season.episodes.length} episode${season.episodes.length === 1 ? "" : "s"}`}
      </p>
    </>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href={`/tv/${showId}`} className="text-sm text-accent hover:text-accent-hover">
        ← {show.name}
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex flex-col gap-4 sm:sticky sm:top-20 sm:w-48 sm:shrink-0 sm:self-start">
          <div className="flex items-start gap-4">
            <div className="w-32 shrink-0 sm:w-full">
              <DetailPoster url={poster} alt={season.name} />
            </div>
            <div className="min-w-0 flex-1 sm:hidden">{header}</div>
          </div>
          {user ? (
            <LogSeasonForm
              tmdbShowId={showId}
              seasonNumber={seasonNumber}
              seasonName={season.name}
              posterUrl={poster}
              watches={watches}
            />
          ) : (
            <SignInPrompt />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="hidden sm:block">{header}</div>
          {season.overview && <p className="max-w-2xl sm:mt-3">{season.overview}</p>}

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Episodes</h2>
            <EpisodeList episodes={season.episodes} />
          </section>

          <FriendsWhoWatched friends={friends} />

          <ReviewsSection
            reviews={reviews}
            viewerId={user?.id ?? null}
            sort={reviewSort}
            basePath={`/tv/${showId}/season/${seasonNumber}`}
          />
        </div>
      </div>
    </main>
  );
};

export default SeasonPage;
