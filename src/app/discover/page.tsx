import { createClient } from "@/lib/supabase/server";
import { HomeSection } from "@/components/home-section";
import { MediaRow } from "@/components/media-row";
import { MoodPicker } from "@/components/mood-picker";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import { fetchPopularMovies, fetchPopularShows } from "@/lib/tmdb/discover";

/** Browse content that's the same for everyone; personal sections stay on the home page. */
const DiscoverPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [popularMovies, popularShows, watchlistRows] = await Promise.all([
    fetchPopularMovies(),
    fetchPopularShows(),
    // Only the keys are needed (to mark cards as watchlisted), so skip the
    // per-item TMDB lookups getWatchlistItems would do.
    user
      ? supabase
          .from("watchlist")
          .select("tmdb_id, media_type")
          .eq("user_id", user.id)
          .then(({ data }) => data ?? [])
      : Promise.resolve([]),
  ]);

  const watchlistKeys = new Set(
    watchlistRows.map((row) => `${row.media_type}-${row.tmdb_id}`),
  );
  const userId = user?.id ?? null;

  const movieItems = popularMovies.results
    .slice(0, 12)
    .map((result) => toMediaCardItem(result, "movie"));
  const showItems = popularShows.results
    .slice(0, 12)
    .map((result) => toMediaCardItem(result, "tv"));

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <h1 className="text-2xl font-semibold">Discover</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find something to watch by mood, or see what&apos;s popular right now.
        </p>
      </div>

      <MoodPicker userId={userId} watchlistKeys={watchlistKeys} />

      <HomeSection title="Popular movies">
        <MediaRow items={movieItems} userId={userId} watchlistKeys={watchlistKeys} />
      </HomeSection>

      <HomeSection title="Popular TV shows">
        <MediaRow items={showItems} userId={userId} watchlistKeys={watchlistKeys} />
      </HomeSection>
    </main>
  );
};

export default DiscoverPage;
