import { tmdbFetch } from "@/lib/tmdb/client";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

// TMDB tags non-scripted TV (reality/talk/news) with these genre ids.
// Excluded via /discover/tv so "Popular" rows read as watchable stories
// (Breaking Bad, Game of Thrones) rather than TMDB's raw popularity mix.
export const NON_SCRIPTED_TV_GENRE_IDS = "10764,10767,10763";

// A high popularity score can come from a handful of votes on something new
// or obscure. Requiring a minimum vote count keeps "Popular" results to
// titles with an actual track record, without changing the sort itself.
export const MIN_VOTE_COUNT = "500";

/** The "Popular movies" row source, shared by the home and discover pages. */
export const fetchPopularMovies = () =>
  tmdbFetch<TmdbSearchResponse>("/discover/movie", {
    sort_by: "popularity.desc",
    "vote_count.gte": MIN_VOTE_COUNT,
  });

/** The "Popular TV shows" row source, shared by the home and discover pages. */
export const fetchPopularShows = () =>
  tmdbFetch<TmdbSearchResponse>("/discover/tv", {
    sort_by: "popularity.desc",
    "vote_count.gte": MIN_VOTE_COUNT,
    without_genres: NON_SCRIPTED_TV_GENRE_IDS,
  });
