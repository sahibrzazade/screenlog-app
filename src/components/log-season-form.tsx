"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import {
  deleteSeasonLog,
  logSeason,
  type DeleteSeasonLogFormState,
  type LogSeasonFormState,
} from "@/app/tv/[id]/actions";

type LogSeasonFormProps = {
  tmdbShowId: number;
  seasonNumber: number;
  initialLog: { rating: number; review: string | null; watchedDate: string } | null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const LogSeasonForm = ({ tmdbShowId, seasonNumber, initialLog }: LogSeasonFormProps) => {
  const [state, formAction, pending] = useActionState<LogSeasonFormState, FormData>(
    logSeason,
    undefined,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState<
    DeleteSeasonLogFormState,
    FormData
  >(deleteSeasonLog, undefined);

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);

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
      toast.success(wasExistingLogRef.current ? "Season log updated" : "Season log saved");
      wasExistingLogRef.current = true;
    }
  }, [state]);

  useEffect(() => {
    if (deleteState && "success" in deleteState) {
      toast.success("Season log deleted");
      wasExistingLogRef.current = false;
    }
  }, [deleteState]);

  const watchedDateId = `watchedDate-season-${seasonNumber}`;
  const reviewId = `review-season-${seasonNumber}`;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <form key={hasLog ? "edit" : "new"} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
        <input type="hidden" name="seasonNumber" value={seasonNumber} />
        <RatingStars value={rating} onChange={setRating} />

        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-600 select-none dark:text-neutral-400">
            Date finished & review
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <div>
              <label htmlFor={watchedDateId} className="mb-1 block text-xs font-medium">
                Date finished
              </label>
              <input
                id={watchedDateId}
                name="watchedDate"
                type="date"
                required
                defaultValue={initialLog?.watchedDate ?? todayIso()}
                max={todayIso()}
                className="border border-neutral-400 rounded bg-white px-2 py-1 text-neutral-900"
              />
            </div>
            <div>
              <label htmlFor={reviewId} className="mb-1 block text-xs font-medium">
                Review (optional)
              </label>
              <textarea
                id={reviewId}
                name="review"
                rows={2}
                defaultValue={initialLog?.review ?? ""}
                maxLength={2000}
                className="w-full border border-neutral-400 rounded bg-white px-2 py-1 text-neutral-900"
              />
            </div>
          </div>
        </details>

        {state && "error" in state && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : initialLog ? "Update rating" : "Rate season"}
        </button>
      </form>

      {initialLog && (
        <form
          action={deleteFormAction}
          onSubmit={(event) => {
            if (!confirm("Delete this season log? This can't be undone.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
          <input type="hidden" name="seasonNumber" value={seasonNumber} />
          {deleteState && "error" in deleteState && (
            <p role="alert" className="mb-1 text-sm text-red-600 dark:text-red-400">
              {deleteState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={deletePending}
            className="self-start rounded border border-red-600 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
          >
            {deletePending ? "Deleting..." : "Delete log"}
          </button>
        </form>
      )}
    </div>
  );
};
