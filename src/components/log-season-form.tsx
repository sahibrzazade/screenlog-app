"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RatingStars } from "@/components/rating-stars";
import { logSeason, type LogSeasonFormState } from "@/app/tv/[id]/actions";

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

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(wasExistingLogRef.current ? "Season log updated" : "Season log saved");
      wasExistingLogRef.current = true;
    }
  }, [state]);

  const watchedDateId = `watchedDate-season-${seasonNumber}`;
  const reviewId = `review-season-${seasonNumber}`;

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="tmdbShowId" value={tmdbShowId} />
      <input type="hidden" name="seasonNumber" value={seasonNumber} />
      <RatingStars value={rating} onChange={setRating} />

      <details className="text-sm">
        <summary className="cursor-pointer text-neutral-600 select-none dark:text-neutral-400">
          Watched date & review
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <div>
            <label htmlFor={watchedDateId} className="mb-1 block text-xs font-medium">
              Watched date
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
  );
};
