"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { showLogSchema } from "@/lib/validation/show-log";
import { seasonLogSchema } from "@/lib/validation/season-log";
import { ratingSchema } from "@/lib/validation/rating";

export type LogShowFormState = { error: string } | { success: true } | undefined;

// Saves the review + watched date only. Rating is set separately (see
// setShowRating below) so that clicking a star saves immediately without
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a show." };
  }

  const { error } = await supabase.from("show_logs").upsert(
    {
      user_id: user.id,
      tmdb_show_id: parsed.data.tmdbShowId,
      review: parsed.data.review ?? null,
      watched_date: parsed.data.watchedDate,
    },
    { onConflict: "user_id,tmdb_show_id" },
  );

  if (error) {
    return { error: "Failed to save your log. Please try again." };
  }

  revalidatePath(`/tv/${parsed.data.tmdbShowId}`);
  return { success: true };
};

export type SetShowRatingState = { rating: number | null; error?: string };

// Upserts only the rating column, so any existing review/watched date is
// left untouched. Also implicitly marks the show as watched, since a row
// existing in show_logs is what "watched" means.
export const setShowRating = async (
  prevState: SetShowRatingState,
  formData: FormData,
): Promise<SetShowRatingState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));
  const parsedRating = ratingSchema.safeParse(formData.get("rating"));

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { rating: prevState.rating, error: "Invalid show." };
  }
  if (!parsedRating.success) {
    return { rating: prevState.rating, error: "Invalid rating." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rating: prevState.rating, error: "You must be logged in to do this." };
  }

  const { error } = await supabase.from("show_logs").upsert(
    {
      user_id: user.id,
      tmdb_show_id: tmdbShowId,
      rating: parsedRating.data,
    },
    { onConflict: "user_id,tmdb_show_id" },
  );

  if (error) {
    return { rating: prevState.rating, error: "Failed to save your rating. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { rating: parsedRating.data };
};

export type ClearShowLogFieldState = { error: string } | { success: true } | undefined;

export const clearShowLogField = async (
  _prevState: ClearShowLogFieldState,
  formData: FormData,
): Promise<ClearShowLogFieldState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));
  const field = formData.get("field");

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { error: "Invalid show." };
  }
  if (field !== "rating" && field !== "review") {
    return { error: "Invalid field." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to do this." };
  }

  const { error } = await supabase
    .from("show_logs")
    .update({ [field]: null })
    .eq("user_id", user.id)
    .eq("tmdb_show_id", tmdbShowId);

  if (error) {
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { success: true };
};

export type DeleteShowLogFormState = { error: string } | { success: true } | undefined;

export const deleteShowLog = async (
  _prevState: DeleteShowLogFormState,
  formData: FormData,
): Promise<DeleteShowLogFormState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { error: "Invalid show." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete a log." };
  }

  const { error } = await supabase
    .from("show_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_show_id", tmdbShowId);

  if (error) {
    return { error: "Failed to delete your log. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { success: true };
};

export type LogSeasonFormState = { error: string } | { success: true } | undefined;

// Saves the review + watched date only. Rating is set separately (see
// setSeasonRating below) so that clicking a star saves immediately without
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a season." };
  }

  const { error } = await supabase.from("season_logs").upsert(
    {
      user_id: user.id,
      tmdb_show_id: parsed.data.tmdbShowId,
      season_number: parsed.data.seasonNumber,
      review: parsed.data.review ?? null,
      watched_date: parsed.data.watchedDate,
    },
    { onConflict: "user_id,tmdb_show_id,season_number" },
  );

  if (error) {
    return { error: "Failed to save your log. Please try again." };
  }

  revalidatePath(`/tv/${parsed.data.tmdbShowId}`);
  return { success: true };
};

export type SetSeasonRatingState = { rating: number | null; error?: string };

// Upserts only the rating column, so any existing review/watched date is
// left untouched. Also implicitly marks the season as watched, since a row
// existing in season_logs is what "watched" means.
export const setSeasonRating = async (
  prevState: SetSeasonRatingState,
  formData: FormData,
): Promise<SetSeasonRatingState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));
  const seasonNumber = Number(formData.get("seasonNumber"));
  const parsedRating = ratingSchema.safeParse(formData.get("rating"));

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { rating: prevState.rating, error: "Invalid show." };
  }
  if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
    return { rating: prevState.rating, error: "Invalid season." };
  }
  if (!parsedRating.success) {
    return { rating: prevState.rating, error: "Invalid rating." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { rating: prevState.rating, error: "You must be logged in to do this." };
  }

  const { error } = await supabase.from("season_logs").upsert(
    {
      user_id: user.id,
      tmdb_show_id: tmdbShowId,
      season_number: seasonNumber,
      rating: parsedRating.data,
    },
    { onConflict: "user_id,tmdb_show_id,season_number" },
  );

  if (error) {
    return { rating: prevState.rating, error: "Failed to save your rating. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { rating: parsedRating.data };
};

export type ClearSeasonLogFieldState = { error: string } | { success: true } | undefined;

export const clearSeasonLogField = async (
  _prevState: ClearSeasonLogFieldState,
  formData: FormData,
): Promise<ClearSeasonLogFieldState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));
  const seasonNumber = Number(formData.get("seasonNumber"));
  const field = formData.get("field");

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { error: "Invalid show." };
  }
  if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
    return { error: "Invalid season." };
  }
  if (field !== "rating" && field !== "review") {
    return { error: "Invalid field." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to do this." };
  }

  const { error } = await supabase
    .from("season_logs")
    .update({ [field]: null })
    .eq("user_id", user.id)
    .eq("tmdb_show_id", tmdbShowId)
    .eq("season_number", seasonNumber);

  if (error) {
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { success: true };
};

export type DeleteSeasonLogFormState = { error: string } | { success: true } | undefined;

export const deleteSeasonLog = async (
  _prevState: DeleteSeasonLogFormState,
  formData: FormData,
): Promise<DeleteSeasonLogFormState> => {
  const tmdbShowId = Number(formData.get("tmdbShowId"));
  const seasonNumber = Number(formData.get("seasonNumber"));

  if (!Number.isInteger(tmdbShowId) || tmdbShowId <= 0) {
    return { error: "Invalid show." };
  }
  if (!Number.isInteger(seasonNumber) || seasonNumber < 0) {
    return { error: "Invalid season." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete a log." };
  }

  const { error } = await supabase
    .from("season_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_show_id", tmdbShowId)
    .eq("season_number", seasonNumber);

  if (error) {
    return { error: "Failed to delete your log. Please try again." };
  }

  revalidatePath(`/tv/${tmdbShowId}`);
  return { success: true };
};
