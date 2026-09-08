"use server";

import {
  clearLogField,
  deleteLog,
  parseTmdbId,
  saveLog,
  saveRating,
  toggleWatched,
  type LogTarget,
  type MutationState,
  type RatingState,
  type WatchedState,
} from "@/lib/logs/mutations";
import { movieLogSchema } from "@/lib/validation/movie-log";
import { ratingSchema } from "@/lib/validation/rating";

export type LogMovieFormState = MutationState;
export type SetMovieRatingState = RatingState;
export type ToggleMovieWatchedState = WatchedState;
export type ClearMovieLogFieldState = MutationState;
export type DeleteMovieLogFormState = MutationState;

const movieTarget = (tmdbMovieId: number): LogTarget => ({
  table: "movie_logs",
  match: { tmdb_movie_id: tmdbMovieId },
  onConflict: "tmdb_movie_id",
  revalidate: `/movie/${tmdbMovieId}`,
  entity: "movie",
});

// Saves the review + watched date only. Rating is set separately (see
// setMovieRating) so that clicking a star saves immediately without
// requiring this form to be submitted.
export const logMovie = async (
  _prevState: LogMovieFormState,
  formData: FormData,
): Promise<LogMovieFormState> => {
  const parsed = movieLogSchema.safeParse({
    tmdbMovieId: formData.get("tmdbMovieId"),
    review: formData.get("review"),
    watchedDate: formData.get("watchedDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return saveLog(
    movieTarget(parsed.data.tmdbMovieId),
    parsed.data.review ?? null,
    parsed.data.watchedDate,
  );
};

export const setMovieRating = async (
  prevState: SetMovieRatingState,
  formData: FormData,
): Promise<SetMovieRatingState> => {
  const tmdbMovieId = parseTmdbId(formData.get("tmdbMovieId"));
  if (tmdbMovieId === null) {
    return { rating: prevState.rating, error: "Invalid movie." };
  }

  const parsedRating = ratingSchema.safeParse(formData.get("rating"));
  if (!parsedRating.success) {
    return { rating: prevState.rating, error: "Invalid rating." };
  }

  return saveRating(movieTarget(tmdbMovieId), parsedRating.data, prevState.rating);
};

export const toggleMovieWatched = async (
  _prevState: ToggleMovieWatchedState,
  formData: FormData,
): Promise<ToggleMovieWatchedState> => {
  const currentlyWatched = formData.get("isWatched") === "true";
  const tmdbMovieId = parseTmdbId(formData.get("tmdbMovieId"));
  if (tmdbMovieId === null) {
    return { isWatched: currentlyWatched, error: "Invalid movie." };
  }

  return toggleWatched(movieTarget(tmdbMovieId), currentlyWatched);
};

export const clearMovieLogField = async (
  _prevState: ClearMovieLogFieldState,
  formData: FormData,
): Promise<ClearMovieLogFieldState> => {
  const tmdbMovieId = parseTmdbId(formData.get("tmdbMovieId"));
  if (tmdbMovieId === null) return { error: "Invalid movie." };

  const field = formData.get("field");
  if (field !== "rating" && field !== "review") return { error: "Invalid field." };

  return clearLogField(movieTarget(tmdbMovieId), field);
};

export const deleteMovieLog = async (
  _prevState: DeleteMovieLogFormState,
  formData: FormData,
): Promise<DeleteMovieLogFormState> => {
  const tmdbMovieId = parseTmdbId(formData.get("tmdbMovieId"));
  if (tmdbMovieId === null) return { error: "Invalid movie." };

  return deleteLog(movieTarget(tmdbMovieId));
};
