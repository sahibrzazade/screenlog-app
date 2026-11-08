import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserContext, type SupabaseServerClient } from "@/lib/supabase/auth";
import { todayIso } from "@/lib/date";

/**
 * Everything the movie / show / season log mutations need to find the user's
 * log(s) for a title. `match` is the set of columns that identify the title
 * (e.g. `{ tmdb_movie_id }`, or `{ tmdb_show_id, season_number }` for
 * seasons). A movie or season can have several logs, one per watch
 * (migration 0021); a show has one.
 */
export type LogTarget = {
  table: "movie_logs" | "show_logs" | "season_logs";
  match: Record<string, number>;
  revalidate: string;
  entity: "movie" | "show" | "season";
};

export type MutationState = { error: string } | { success: true } | undefined;
export type RatingState = { rating: number | null; error?: string };
export type WatchedState = { isWatched: boolean; error?: string };

const NOT_LOGGED_IN = (verb: string) => `You must be logged in to ${verb}.`;
const INVALID_LOG = "Invalid log.";

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

/**
 * Parse the optional log id a form sends to say which watch it edits: null
 * when absent (the title's latest log), undefined when malformed.
 */
export const parseLogId = (value: FormDataEntryValue | null): string | null | undefined => {
  if (value === null || value === "") return null;
  return z.uuid().safeParse(value).success ? String(value) : undefined;
};

/** Filter for the user's logs of the target's title. */
const ownTitle = (userId: string, target: LogTarget) => ({ user_id: userId, ...target.match });

/** The id of the user's latest watch of the title (newest date, then newest log), or null. */
const findLatestLogId = async (
  supabase: SupabaseServerClient,
  userId: string,
  target: LogTarget,
): Promise<string | null> => {
  const { data } = await supabase
    .from(target.table)
    .select("id")
    .match(ownTitle(userId, target))
    .order("watched_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
};

/**
 * Writes `values` to one log: the one `logId` names, or without it the title's
 * latest, so a form sent before the page knew a log's id still updates that
 * log instead of adding a watch. With no log yet, inserts the first one. The
 * update is also filtered on the user and title, so an id from elsewhere
 * changes nothing.
 */
const writeLog = async (
  supabase: SupabaseServerClient,
  userId: string,
  target: LogTarget,
  logId: string | null,
  values: Record<string, string | number | null>,
): Promise<boolean> => {
  const id = logId ?? (await findLatestLogId(supabase, userId, target));

  if (!id) {
    const { error } = await supabase.from(target.table).insert({ user_id: userId, ...target.match, ...values });
    return !error;
  }

  const { data, error } = await supabase
    .from(target.table)
    .update(values)
    .match(ownTitle(userId, target))
    .eq("id", id)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
};

/**
 * Saves the review + watched date (plus any table-specific `extra` columns,
 * e.g. a show's `status`), leaving the rating column untouched.
 */
export const saveLog = async (
  target: LogTarget,
  rawLogId: FormDataEntryValue | null,
  review: string | null,
  watchedDate: string,
  extra: Record<string, string> = {},
): Promise<MutationState> => {
  const logId = parseLogId(rawLogId);
  if (logId === undefined) return { error: INVALID_LOG };

  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN(`log a ${target.entity}`) };

  const saved = await writeLog(supabase, user.id, target, logId, {
    review,
    watched_date: watchedDate,
    ...extra,
  });
  if (!saved) return { error: "Failed to save your log. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/**
 * Saves only the rating column (a first rating creates the log, marking the
 * title watched). On failure the caller's previously displayed rating is
 * echoed back unchanged.
 */
export const saveRating = async (
  target: LogTarget,
  rawLogId: FormDataEntryValue | null,
  rating: number,
  fallbackRating: number | null,
): Promise<RatingState> => {
  const logId = parseLogId(rawLogId);
  if (logId === undefined) return { rating: fallbackRating, error: INVALID_LOG };

  const { supabase, user } = await getUserContext();
  if (!user) {
    return { rating: fallbackRating, error: NOT_LOGGED_IN("do this") };
  }

  const saved = await writeLog(supabase, user.id, target, logId, { rating });
  if (!saved) {
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
  rawLogId: FormDataEntryValue | null,
  field: "rating" | "review",
): Promise<MutationState> => {
  const logId = parseLogId(rawLogId);
  if (logId === undefined) return { error: INVALID_LOG };

  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN("do this") };

  const id = logId ?? (await findLatestLogId(supabase, user.id, target));
  if (!id) return { error: "Failed to update. Please try again." };

  const { error } = await supabase
    .from(target.table)
    .update({ [field]: null })
    .match(ownTitle(user.id, target))
    .eq("id", id);
  if (error) return { error: "Failed to update. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/** Deletes one of the user's logs for a title: the one `logId` names, or the latest. */
export const deleteLog = async (
  target: LogTarget,
  rawLogId: FormDataEntryValue | null,
): Promise<MutationState> => {
  const logId = parseLogId(rawLogId);
  if (logId === undefined) return { error: INVALID_LOG };

  const { supabase, user } = await getUserContext();
  if (!user) return { error: NOT_LOGGED_IN("delete a log") };

  const id = logId ?? (await findLatestLogId(supabase, user.id, target));
  if (!id) return { error: "Failed to delete your log. Please try again." };

  const { error } = await supabase.from(target.table).delete().match(ownTitle(user.id, target)).eq("id", id);
  if (error) return { error: "Failed to delete your log. Please try again." };

  revalidatePath(target.revalidate);
  return { success: true };
};

/**
 * Flips the watched state for a title. Marking watched inserts a bare log
 * row unless one already exists; un-marking deletes it, but only when it is
 * the only watch and carries no rating/review — anything else must be
 * removed from the full log form instead.
 */
export const toggleWatched = async (
  target: LogTarget,
  currentlyWatched: boolean,
): Promise<WatchedState> => {
  const { supabase, user } = await getUserContext();
  if (!user) {
    return { isWatched: currentlyWatched, error: NOT_LOGGED_IN("do this") };
  }

  const { data: logs, error: readError } = await supabase
    .from(target.table)
    .select("id, rating, review")
    .match(ownTitle(user.id, target));
  if (readError || !logs) {
    return { isWatched: currentlyWatched, error: "Failed to update. Please try again." };
  }

  if (!currentlyWatched) {
    // Already logged (a stale button): nothing to add.
    if (logs.length > 0) {
      revalidatePath(target.revalidate);
      return { isWatched: true };
    }

    const { error } = await supabase.from(target.table).insert({
      user_id: user.id,
      ...target.match,
      rating: null,
      review: null,
      watched_date: todayIso(),
    });

    // A unique violation (shows keep one log each) means it was just logged.
    if (error && error.code !== "23505") {
      return {
        isWatched: false,
        error: `Failed to mark this ${target.entity} as watched. Please try again.`,
      };
    }

    revalidatePath(target.revalidate);
    return { isWatched: true };
  }

  if (logs.length === 0) {
    return { isWatched: false };
  }

  if (logs.length > 1) {
    return {
      isWatched: true,
      error: "You've logged this more than once — delete a watch from Your log instead.",
    };
  }

  const [log] = logs;
  if (log.rating !== null || log.review !== null) {
    return {
      isWatched: true,
      error:
        "This log has a rating or review — delete it from Your log below instead.",
    };
  }

  const { error: deleteError } = await supabase
    .from(target.table)
    .delete()
    .match(ownTitle(user.id, target))
    .eq("id", log.id);

  if (deleteError) {
    return { isWatched: true, error: "Failed to update. Please try again." };
  }

  revalidatePath(target.revalidate);
  return { isWatched: false };
};
