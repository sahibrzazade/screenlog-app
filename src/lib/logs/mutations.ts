import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/supabase/auth";
import { todayIso } from "@/lib/date";

/**
 * Everything the movie / show / season log mutations need to target the right
 * row(s). `match` is the set of columns that identify a user's log for a title
 * (e.g. `{ tmdb_movie_id }`, or `{ tmdb_show_id, season_number }` for seasons);
 * `onConflict` is the matching upsert conflict target minus `user_id`, which is
 * always prepended.
 */
export type LogTarget = {
  table: "movie_logs" | "show_logs" | "season_logs";
  match: Record<string, number>;
  onConflict: string;
  revalidate: string;
  entity: "movie" | "show" | "season";
};

export type MutationState = { error: string } | { success: true } | undefined;
export type RatingState = { rating: number | null; error?: string };
export type WatchedState = { isWatched: boolean; error?: string };

const NOT_LOGGED_IN = (verb: string) => `You must be logged in to ${verb}.`;

/** Parse a positive-integer TMDB id from raw form input; null when invalid. */
export const parseTmdbId = (value: FormDataEntryValue | null): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Parse a non-negative season number from raw form input; null when invalid. */
export const parseSeasonNumber = (
  value: FormDataEntryValue | null,
): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

/** Upserts the review + watched date, leaving the rating column untouched. */
export const saveLog = async (
  target: LogTarget,
  review: string | null,
  watchedDate: string,
): Promise<MutationState> => {
  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN(`log a ${target.entity}`) };

  const { error } = await supabase.from(target.table).upsert(
    { user_id: user.id, ...target.match, review, watched_date: watchedDate },
    { onConflict: `user_id,${target.onConflict}` },
  );
  if (error) return { error: "Failed to save your log. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/**
 * Upserts only the rating column (implicitly marks the title watched). On
 * failure the caller's previously displayed rating is echoed back unchanged.
 */
export const saveRating = async (
  target: LogTarget,
  rating: number,
  fallbackRating: number | null,
): Promise<RatingState> => {
  const { supabase, user } = await getUserContext();
  if (!user) {
    return { rating: fallbackRating, error: NOT_LOGGED_IN("do this") };
  }

  const { error } = await supabase.from(target.table).upsert(
    { user_id: user.id, ...target.match, rating },
    { onConflict: `user_id,${target.onConflict}` },
  );
  if (error) {
    return {
      rating: fallbackRating,
      error: "Failed to save your rating. Please try again.",
    };
  }

  revalidatePath(target.revalidate);
  return { rating };
};

/** Nulls out a single column (`rating` or `review`) on an existing log. */
export const clearLogField = async (
  target: LogTarget,
  field: "rating" | "review",
): Promise<MutationState> => {
  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN("do this") };

  let query = supabase
    .from(target.table)
    .update({ [field]: null })
    .eq("user_id", user.id);
  for (const [column, value] of Object.entries(target.match)) {
    query = query.eq(column, value);
  }

  const { error } = await query;
  if (error) return { error: "Failed to update. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/** Deletes a user's log for a title (or season). */
export const deleteLog = async (target: LogTarget): Promise<MutationState> => {
  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN("delete a log") };

  let query = supabase.from(target.table).delete().eq("user_id", user.id);
  for (const [column, value] of Object.entries(target.match)) {
    query = query.eq(column, value);
  }

  const { error } = await query;
  if (error) return { error: "Failed to delete your log. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/**
 * Flips the watched state for a movie or show. Marking watched inserts a bare
 * log row; un-marking deletes it, but only when it carries no rating/review —
 * those must be removed from the full log form instead.
 */
export const toggleWatched = async (
  target: LogTarget,
  currentlyWatched: boolean,
): Promise<WatchedState> => {
  const { supabase, user } = await getUserContext();
  if (!user) {
    return { isWatched: currentlyWatched, error: NOT_LOGGED_IN("do this") };
  }

  if (!currentlyWatched) {
    const { error } = await supabase.from(target.table).insert({
      user_id: user.id,
      ...target.match,
      rating: null,
      review: null,
      watched_date: todayIso(),
    });

    // A unique violation just means this title is already logged — treat it as
    // success rather than overwriting an existing rating/review with an upsert.
    if (error && error.code !== "23505") {
      return {
        isWatched: false,
        error: `Failed to mark this ${target.entity} as watched. Please try again.`,
      };
    }

    revalidatePath(target.revalidate);
    return { isWatched: true };
  }

  let existingQuery = supabase
    .from(target.table)
    .select("rating, review")
    .eq("user_id", user.id);
  for (const [column, value] of Object.entries(target.match)) {
    existingQuery = existingQuery.eq(column, value);
  }
  const { data: existingLog } = await existingQuery.maybeSingle();

  if (!existingLog) {
    return { isWatched: false };
  }

  if (existingLog.rating !== null || existingLog.review !== null) {
    return {
      isWatched: true,
      error:
        "This log has a rating or review — delete it from Your log below instead.",
    };
  }

  let deleteQuery = supabase.from(target.table).delete().eq("user_id", user.id);
  for (const [column, value] of Object.entries(target.match)) {
    deleteQuery = deleteQuery.eq(column, value);
  }
  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    return { isWatched: true, error: "Failed to update. Please try again." };
  }

  revalidatePath(target.revalidate);
  return { isWatched: false };
};
