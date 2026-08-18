"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { movieLogSchema } from "@/lib/validation/movie-log";

export type LogMovieFormState = { error: string } | { success: true } | undefined;

export const logMovie = async (
  _prevState: LogMovieFormState,
  formData: FormData,
): Promise<LogMovieFormState> => {
  const parsed = movieLogSchema.safeParse({
    tmdbMovieId: formData.get("tmdbMovieId"),
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
    return { error: "You must be logged in to log a movie." };
  }

  const { error } = await supabase.from("movie_logs").upsert(
    {
      user_id: user.id,
      tmdb_movie_id: parsed.data.tmdbMovieId,
      rating: parsed.data.rating,
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
