"use server";

import {
  clearLogField,
  deleteLog,
  parseSeasonNumber,
  parseTmdbId,
  saveLog,
  saveRating,
  toggleWatched,
  type LogTarget,
  type MutationState,
  type RatingState,
  type WatchedState,
} from "@/lib/logs/mutations";
import { showLogSchema } from "@/lib/validation/show-log";
import { seasonLogSchema } from "@/lib/validation/season-log";
import { ratingSchema } from "@/lib/validation/rating";

export type LogShowFormState = MutationState;
export type SetShowRatingState = RatingState;
export type ToggleShowWatchedState = WatchedState;
export type ClearShowLogFieldState = MutationState;
export type DeleteShowLogFormState = MutationState;

export type LogSeasonFormState = MutationState;
export type SetSeasonRatingState = RatingState;
export type ClearSeasonLogFieldState = MutationState;
export type DeleteSeasonLogFormState = MutationState;

const showTarget = (tmdbShowId: number): LogTarget => ({
  table: "show_logs",
  match: { tmdb_show_id: tmdbShowId },
  onConflict: "tmdb_show_id",
  revalidate: `/tv/${tmdbShowId}`,
  entity: "show",
});

const seasonTarget = (tmdbShowId: number, seasonNumber: number): LogTarget => ({
  table: "season_logs",
  match: { tmdb_show_id: tmdbShowId, season_number: seasonNumber },
  onConflict: "tmdb_show_id,season_number",
  revalidate: `/tv/${tmdbShowId}`,
  entity: "season",
});

/* --------------------------------- shows ---------------------------------- */

// Saves the review + watched date only. Rating is set separately (see
// setShowRating) so that clicking a star saves immediately without
// requiring this form to be submitted.
export const logShow = async (
  _prevState: LogShowFormState,
  formData: FormData,
): Promise<LogShowFormState> => {
  const parsed = showLogSchema.safeParse({
    tmdbShowId: formData.get("tmdbShowId"),
    review: formData.get("review"),
    watchedDate: formData.get("watchedDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return saveLog(
    showTarget(parsed.data.tmdbShowId),
    parsed.data.review ?? null,
    parsed.data.watchedDate,
  );
};

export const setShowRating = async (
  prevState: SetShowRatingState,
  formData: FormData,
): Promise<SetShowRatingState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) {
    return { rating: prevState.rating, error: "Invalid show." };
  }

  const parsedRating = ratingSchema.safeParse(formData.get("rating"));
  if (!parsedRating.success) {
    return { rating: prevState.rating, error: "Invalid rating." };
  }

  return saveRating(showTarget(tmdbShowId), parsedRating.data, prevState.rating);
};

export const toggleShowWatched = async (
  _prevState: ToggleShowWatchedState,
  formData: FormData,
): Promise<ToggleShowWatchedState> => {
  const currentlyWatched = formData.get("isWatched") === "true";
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) {
    return { isWatched: currentlyWatched, error: "Invalid show." };
  }

  return toggleWatched(showTarget(tmdbShowId), currentlyWatched);
};

export const clearShowLogField = async (
  _prevState: ClearShowLogFieldState,
  formData: FormData,
): Promise<ClearShowLogFieldState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) return { error: "Invalid show." };

  const field = formData.get("field");
  if (field !== "rating" && field !== "review") return { error: "Invalid field." };

  return clearLogField(showTarget(tmdbShowId), field);
};

export const deleteShowLog = async (
  _prevState: DeleteShowLogFormState,
  formData: FormData,
): Promise<DeleteShowLogFormState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) return { error: "Invalid show." };

  return deleteLog(showTarget(tmdbShowId));
};

/* -------------------------------- seasons -------------------------------- */

// Saves the review + watched date only. Rating is set separately (see
// setSeasonRating) so that clicking a star saves immediately without
// requiring this form to be submitted.
export const logSeason = async (
  _prevState: LogSeasonFormState,
  formData: FormData,
): Promise<LogSeasonFormState> => {
  const parsed = seasonLogSchema.safeParse({
    tmdbShowId: formData.get("tmdbShowId"),
    seasonNumber: formData.get("seasonNumber"),
    review: formData.get("review"),
    watchedDate: formData.get("watchedDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  return saveLog(
    seasonTarget(parsed.data.tmdbShowId, parsed.data.seasonNumber),
    parsed.data.review ?? null,
    parsed.data.watchedDate,
  );
};

export const setSeasonRating = async (
  prevState: SetSeasonRatingState,
  formData: FormData,
): Promise<SetSeasonRatingState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) {
    return { rating: prevState.rating, error: "Invalid show." };
  }

  const seasonNumber = parseSeasonNumber(formData.get("seasonNumber"));
  if (seasonNumber === null) {
    return { rating: prevState.rating, error: "Invalid season." };
  }

  const parsedRating = ratingSchema.safeParse(formData.get("rating"));
  if (!parsedRating.success) {
    return { rating: prevState.rating, error: "Invalid rating." };
  }

  return saveRating(
    seasonTarget(tmdbShowId, seasonNumber),
    parsedRating.data,
    prevState.rating,
  );
};

export const clearSeasonLogField = async (
  _prevState: ClearSeasonLogFieldState,
  formData: FormData,
): Promise<ClearSeasonLogFieldState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) return { error: "Invalid show." };

  const seasonNumber = parseSeasonNumber(formData.get("seasonNumber"));
  if (seasonNumber === null) return { error: "Invalid season." };

  const field = formData.get("field");
  if (field !== "rating" && field !== "review") return { error: "Invalid field." };

  return clearLogField(seasonTarget(tmdbShowId, seasonNumber), field);
};

export const deleteSeasonLog = async (
  _prevState: DeleteSeasonLogFormState,
  formData: FormData,
): Promise<DeleteSeasonLogFormState> => {
  const tmdbShowId = parseTmdbId(formData.get("tmdbShowId"));
  if (tmdbShowId === null) return { error: "Invalid show." };

  const seasonNumber = parseSeasonNumber(formData.get("seasonNumber"));
  if (seasonNumber === null) return { error: "Invalid season." };

  return deleteLog(seasonTarget(tmdbShowId, seasonNumber));
};
