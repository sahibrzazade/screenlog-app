export type TmdbMediaType = "movie" | "tv";

export type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  popularity?: number;
};

export type TmdbSearchResponse = {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
};

export type TmdbCastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
};

export type TmdbCrewMember = {
  id: number;
  name: string;
  job: string;
};

export type TmdbMovieDetails = {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  recommendations: { results: TmdbSearchResult[] };
  vote_average: number;
  vote_count: number;
};

export type TmdbSeasonSummary = {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
};

export type TmdbEpisode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  /** Minutes; null when TMDB doesn't know it. */
  runtime?: number | null;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
};

export type TmdbSeasonDetails = {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TmdbEpisode[];
};

/** One acting credit from `/person/{id}?append_to_response=combined_credits`. */
export type TmdbPersonCastCredit = {
  id: number;
  media_type: TmdbMediaType;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  character: string | null;
  vote_count: number;
  genre_ids: number[];
};

export type TmdbPersonDetails = {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  combined_credits: { cast: TmdbPersonCastCredit[] };
};

export type TmdbShowDetails = {
  id: number;
  name: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  number_of_seasons: number;
  seasons: TmdbSeasonSummary[];
  genres: { id: number; name: string }[];
  created_by: { id: number; name: string }[];
  credits: { cast: TmdbCastMember[] };
  recommendations: { results: TmdbSearchResult[] };
  vote_average: number;
  vote_count: number;
};
