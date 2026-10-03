import { tmdbFetch } from "@/lib/tmdb/client";
import { posterUrl } from "@/lib/tmdb/images";
import { NON_SCRIPTED_TV_GENRE_IDS, MIN_VOTE_COUNT } from "@/lib/tmdb/discover";
import { AuthPosterGrid } from "@/components/auth-poster-grid";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

const LoginPage = async () => {
  const [popularMovies, popularShows] = await Promise.all([
    tmdbFetch<TmdbSearchResponse>("/discover/movie", {
      sort_by: "popularity.desc",
      "vote_count.gte": MIN_VOTE_COUNT,
    }),
    tmdbFetch<TmdbSearchResponse>("/discover/tv", {
      sort_by: "popularity.desc",
      "vote_count.gte": MIN_VOTE_COUNT,
      without_genres: NON_SCRIPTED_TV_GENRE_IDS,
    }),
  ]);

  const posters = [...popularMovies.results, ...popularShows.results]
    .map((result) => posterUrl(result.poster_path, "w154"))
    .filter((url): url is string => url !== null);
  // Repeated to comfortably tile very tall viewports — dimmed and small
  // enough that the repetition reads as texture, not a noticeable pattern.
  const tiledPosters = Array.from({ length: 4 }, () => posters).flat();

  return (
    <main className="relative">
      <AuthPosterGrid posterPaths={tiledPosters} />
      <AuthCard>
        <LoginForm />
      </AuthCard>
    </main>
  );
};

export default LoginPage;
