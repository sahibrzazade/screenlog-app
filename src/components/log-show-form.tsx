"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import {
  deleteShowLog,
  logShow,
  type DeleteShowLogFormState,
  type LogShowFormState,
} from "@/app/tv/[id]/actions";

type LogShowFormProps = {
  tmdbShowId: number;
  initialLog: { rating: number; review: string | null; watchedDate: string } | null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const LogShowForm = ({ tmdbShowId, initialLog }: LogShowFormProps) => {
  const [state, formAction, pending] = useActionState<LogShowFormState, FormData>(
    logShow,
    undefined,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState<
    DeleteShowLogFormState,
    FormData
  >(deleteShowLog, undefined);

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
        <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
        <div>
          <span className="mb-1 block text-sm font-medium">Rating</span>
          <RatingStars value={rating} onChange={setRating} />
        </div>
        <div>
          <label htmlFor="watchedDate" className="mb-1 block text-sm font-medium">
            Date finished
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
          {pending ? "Saving..." : initialLog ? "Update rating" : "Rate this show"}
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
          <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
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
