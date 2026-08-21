"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { showLogSchema } from "@/lib/validation/show-log";
import { seasonLogSchema } from "@/lib/validation/season-log";

export type LogShowFormState = { error: string } | { success: true } | undefined;

export const logShow = async (
  _prevState: LogShowFormState,
  formData: FormData,
): Promise<LogShowFormState> => {
  const parsed = showLogSchema.safeParse({
    tmdbShowId: formData.get("tmdbShowId"),
    rating: formData.get("rating"),
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
      rating: parsed.data.rating,
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

export const logSeason = async (
  _prevState: LogSeasonFormState,
  formData: FormData,
): Promise<LogSeasonFormState> => {
  const parsed = seasonLogSchema.safeParse({
    tmdbShowId: formData.get("tmdbShowId"),
    seasonNumber: formData.get("seasonNumber"),
    rating: formData.get("rating"),
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
      rating: parsed.data.rating,
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
