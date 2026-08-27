"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { movieLogSchema } from "@/lib/validation/movie-log";
import { ratingSchema } from "@/lib/validation/rating";

export type LogMovieFormState = { error: string } | { success: true } | undefined;

// Saves the review + watched date only. Rating is set separately (see
// setMovieRating below) so that clicking a star saves immediately without
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a movie." };
  }

  const { error } = await supabase.from("movie_logs").upsert(
    {
      user_id: user.id,
      tmdb_movie_id: parsed.data.tmdbMovieId,
      review: parsed.data.review ?? null,
      watched_date: parsed.data.watchedDate,
    },
    { onConflict: "user_id,tmdb_movie_id" },
  );

  if (error) {
    return { error: "Failed to save your log. Please try again." };
  }

  revalidatePath(`/movie/${parsed.data.tmdbMovieId}`);
  return { success: true };
};

export type SetMovieRatingState = { rating: number | null; error?: string };

// Upserts only the rating column, so any existing review/watched date is
// left untouched. Also implicitly marks the movie as watched, since a row
// existing in movie_logs is what "watched" means.
export const setMovieRating = async (
  prevState: SetMovieRatingState,
  formData: FormData,
): Promise<SetMovieRatingState> => {
  const tmdbMovieId = Number(formData.get("tmdbMovieId"));
  const parsedRating = ratingSchema.safeParse(formData.get("rating"));

  if (!Number.isInteger(tmdbMovieId) || tmdbMovieId <= 0) {
    return { rating: prevState.rating, error: "Invalid movie." };
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

  const { error } = await supabase.from("movie_logs").upsert(
    {
      user_id: user.id,
      tmdb_movie_id: tmdbMovieId,
      rating: parsedRating.data,
    },
    { onConflict: "user_id,tmdb_movie_id" },
  );

  if (error) {
    return { rating: prevState.rating, error: "Failed to save your rating. Please try again." };
  }

  revalidatePath(`/movie/${tmdbMovieId}`);
  return { rating: parsedRating.data };
};

export type ToggleMovieWatchedState = { isWatched: boolean; error?: string };

export const toggleMovieWatched = async (
  prevState: ToggleMovieWatchedState,
  formData: FormData,
): Promise<ToggleMovieWatchedState> => {
  const tmdbMovieId = Number(formData.get("tmdbMovieId"));
  const currentlyWatched = formData.get("isWatched") === "true";

  if (!Number.isInteger(tmdbMovieId) || tmdbMovieId <= 0) {
    return { isWatched: currentlyWatched, error: "Invalid movie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isWatched: currentlyWatched, error: "You must be logged in to do this." };
  }

  if (!currentlyWatched) {
    const { error } = await supabase.from("movie_logs").insert({
      user_id: user.id,
      tmdb_movie_id: tmdbMovieId,
      rating: null,
      review: null,
      watched_date: new Date().toISOString().slice(0, 10),
    });

    // A unique violation just means this movie is already logged — treat it as
    // success rather than overwriting an existing rating/review with an upsert.
    if (error && error.code !== "23505") {
      return { isWatched: false, error: "Failed to mark this movie as watched. Please try again." };
    }

    revalidatePath(`/movie/${tmdbMovieId}`);
    return { isWatched: true };
  }

  const { data: existingLog } = await supabase
    .from("movie_logs")
    .select("rating, review")
    .eq("user_id", user.id)
    .eq("tmdb_movie_id", tmdbMovieId)
    .maybeSingle();

  if (!existingLog) {
    return { isWatched: false };
  }

  if (existingLog.rating !== null || existingLog.review !== null) {
    return {
      isWatched: true,
      error: "This log has a rating or review — delete it from Your log below instead.",
    };
  }

  const { error: deleteError } = await supabase
    .from("movie_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_movie_id", tmdbMovieId);

  if (deleteError) {
    return { isWatched: true, error: "Failed to update. Please try again." };
  }

  revalidatePath(`/movie/${tmdbMovieId}`);
  return { isWatched: false };
};

export type ClearMovieLogFieldState = { error: string } | { success: true } | undefined;

export const clearMovieLogField = async (
  _prevState: ClearMovieLogFieldState,
  formData: FormData,
): Promise<ClearMovieLogFieldState> => {
  const tmdbMovieId = Number(formData.get("tmdbMovieId"));
  const field = formData.get("field");

  if (!Number.isInteger(tmdbMovieId) || tmdbMovieId <= 0) {
    return { error: "Invalid movie." };
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
    .from("movie_logs")
    .update({ [field]: null })
    .eq("user_id", user.id)
    .eq("tmdb_movie_id", tmdbMovieId);

  if (error) {
    return { error: "Failed to update. Please try again." };
  }

  revalidatePath(`/movie/${tmdbMovieId}`);
  return { success: true };
};

export type DeleteMovieLogFormState = { error: string } | { success: true } | undefined;

export const deleteMovieLog = async (
  _prevState: DeleteMovieLogFormState,
  formData: FormData,
): Promise<DeleteMovieLogFormState> => {
  const tmdbMovieId = Number(formData.get("tmdbMovieId"));

  if (!Number.isInteger(tmdbMovieId) || tmdbMovieId <= 0) {
    return { error: "Invalid movie." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete a log." };
  }

  const { error } = await supabase
    .from("movie_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_movie_id", tmdbMovieId);

  if (error) {
    return { error: "Failed to delete your log. Please try again." };
  }

  revalidatePath(`/movie/${tmdbMovieId}`);
  return { success: true };
};
