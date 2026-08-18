"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import {
  deleteMovieLog,
  logMovie,
  type DeleteMovieLogFormState,
  type LogMovieFormState,
} from "@/app/movie/[id]/actions";

type LogMovieFormProps = {
  tmdbMovieId: number;
  initialLog: { rating: number; review: string | null; watchedDate: string } | null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const LogMovieForm = ({ tmdbMovieId, initialLog }: LogMovieFormProps) => {
  const [state, formAction, pending] = useActionState<LogMovieFormState, FormData>(
    logMovie,
    undefined,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState<
    DeleteMovieLogFormState,
    FormData
  >(deleteMovieLog, undefined);

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);

  // Reset the rating once the log disappears (i.e. right after a delete),
  // following the "adjusting state when a prop changes" pattern instead of
  // an effect: https://react.dev/learn/you-might-not-need-an-effect
  const hasLog = initialLog !== null;
  const [prevHasLog, setPrevHasLog] = useState(hasLog);
  if (hasLog !== prevHasLog) {
    setPrevHasLog(hasLog);
    if (!hasLog) {
      setRating(null);
    }
  }

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(wasExistingLogRef.current ? "Log updated" : "Log saved");
      wasExistingLogRef.current = true;
    }
  }, [state]);

  useEffect(() => {
    if (deleteState && "success" in deleteState) {
      toast.success("Log deleted");
      wasExistingLogRef.current = false;
    }
  }, [deleteState]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form key={hasLog ? "edit" : "new"} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="tmdbMovieId" value={tmdbMovieId} />
        <div>
          <span className="mb-1 block text-sm font-medium">Rating</span>
          <RatingStars value={rating} onChange={setRating} />
        </div>
        <div>
          <label htmlFor="watchedDate" className="mb-1 block text-sm font-medium">
            Watched date
          </label>
          <input
            id="watchedDate"
            name="watchedDate"
            type="date"
            required
            defaultValue={initialLog?.watchedDate ?? todayIso()}
            max={todayIso()}
            className="border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
          />
        </div>
        <div>
          <label htmlFor="review" className="mb-1 block text-sm font-medium">
            Review (optional)
          </label>
          <textarea
            id="review"
            name="review"
            rows={4}
            defaultValue={initialLog?.review ?? ""}
            maxLength={2000}
            className="w-full border border-neutral-400 rounded bg-white px-3 py-1.5 text-neutral-900"
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : initialLog ? "Update log" : "Log movie"}
        </button>
      </form>

      {initialLog && (
        <form
          action={deleteFormAction}
          onSubmit={(event) => {
            if (!confirm("Delete this log? This can't be undone.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="tmdbMovieId" value={tmdbMovieId} />
          {deleteState && "error" in deleteState && (
            <p role="alert" className="mb-2 text-red-600 dark:text-red-400">
              {deleteState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={deletePending}
            className="self-start rounded border border-red-600 px-4 py-2 text-red-600 disabled:opacity-50"
          >
            {deletePending ? "Deleting..." : "Delete log"}
          </button>
        </form>
      )}
    </div>
  );
};
