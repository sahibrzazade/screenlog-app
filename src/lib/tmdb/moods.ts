export type MoodId = "action" | "mindbender" | "adventure";

export type Mood = {
  id: MoodId;
  emoji: string;
  label: string;
  /** TMDB `with_genres` value for /discover/movie — comma-separated means AND. */
  movieGenres: string;
  /** TMDB `with_genres` value for /discover/tv — comma-separated means AND. */
  tvGenres: string;
};

// Movie and TV genre ids are mapped separately because TMDB uses a different
// genre taxonomy for each. Only moods that genres alone capture well are
// listed; feelings like "comfort" or "scary" (TV has no Horror genre) need
// TMDB keywords instead.
export const MOODS: Mood[] = [
  {
    id: "action",
    emoji: "🔥",
    label: "an adrenaline rush",
    movieGenres: "28,53", // Action, Thriller
    tvGenres: "10759", // Action & Adventure
  },
  {
    id: "mindbender",
    emoji: "🤯",
    label: "a brain-twister",
    movieGenres: "9648,878", // Mystery, Science Fiction
    tvGenres: "9648,10765", // Mystery, Sci-Fi & Fantasy
  },
  {
    id: "adventure",
    emoji: "🗺️",
    label: "an escape",
    movieGenres: "12,14", // Adventure, Fantasy
    tvGenres: "10759,10765", // Action & Adventure, Sci-Fi & Fantasy
  },
];

export const getMoodById = (id: MoodId): Mood => {
  const mood = MOODS.find((m) => m.id === id);
  if (!mood) throw new Error(`Unknown mood id: ${id}`);
  return mood;
};
