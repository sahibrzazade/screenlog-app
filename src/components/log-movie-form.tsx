"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RatingStars } from "@/components/rating-stars";
import {
  clearMovieLogField,
  deleteMovieLog,
  logMovie,
  setMovieRating,
  type ClearMovieLogFieldState,
  type DeleteMovieLogFormState,
  type LogMovieFormState,
  type SetMovieRatingState,
} from "@/app/movie/[id]/actions";

type LogMovieFormProps = {
  tmdbMovieId: number;
  initialLog: { rating: number | null; review: string | null; watchedDate: string } | null;
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
  const [ratingState, ratingAction] = useActionState<SetMovieRatingState, FormData>(
    setMovieRating,
    { rating: initialLog?.rating ?? null },
  );
  const [clearRatingState, clearRatingAction] = useActionState<
    ClearMovieLogFieldState,
    FormData
  >(clearMovieLogField, undefined);
  const [clearReviewState, clearReviewAction, clearReviewPending] = useActionState<
    ClearMovieLogFieldState,
    FormData
  >(clearMovieLogField, undefined);

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);
  // ratingState is seeded with a real (non-undefined) value, so the effect
  // below would otherwise fire a "Rating saved" toast on first mount even
  // though nothing was clicked. Only toast once a rating was actually set.
  const ratingDispatchedRef = useRef(false);
  // Bumped only on a real delete, to reset the date/review form fields.
  // Rating clicks also flip initialLog between null/non-null (they can
  // create the log row), but that must NOT remount this form, or an
  // in-progress, unsaved review draft would be wiped out from under the user.
  const [formResetKey, setFormResetKey] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Resync the rating whenever the saved rating changes underneath us (full
  // delete, or a rating star click / "remove rating" click above), following
  // the "adjusting state when a prop changes" pattern instead of an effect:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevRatingProp, setPrevRatingProp] = useState(initialLog?.rating ?? null);
  if ((initialLog?.rating ?? null) !== prevRatingProp) {
    setPrevRatingProp(initialLog?.rating ?? null);
    setRating(initialLog?.rating ?? null);
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

  const [prevDeleteState, setPrevDeleteState] = useState(deleteState);
  if (deleteState !== prevDeleteState) {
    setPrevDeleteState(deleteState);
    if (deleteState && "success" in deleteState) {
      setFormResetKey((k) => k + 1);
      setConfirmDeleteOpen(false);
    }
  }

  useEffect(() => {
    if (ratingDispatchedRef.current && !ratingState.error) {
      toast.success("Rating saved");
      wasExistingLogRef.current = true;
    }
  }, [ratingState]);

  useEffect(() => {
    if (clearRatingState && "success" in clearRatingState) {
      toast.success("Rating removed");
    }
  }, [clearRatingState]);

  useEffect(() => {
    if (clearReviewState && "success" in clearReviewState) {
      toast.success("Review removed");
    }
  }, [clearReviewState]);

  const handleRatingChange = (value: number | null) => {
    if (value === null) return;
    setRating(value);
    ratingDispatchedRef.current = true;
    const formData = new FormData();
    formData.set("tmdbMovieId", String(tmdbMovieId));
    formData.set("rating", String(value));
    startTransition(() => ratingAction(formData));
  };

  const clearRating = () => {
    const formData = new FormData();
    formData.set("tmdbMovieId", String(tmdbMovieId));
    formData.set("field", "rating");
    startTransition(() => clearRatingAction(formData));
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <span className="mb-1 block text-sm font-medium">Rating</span>
        <div className="flex items-center gap-2">
          <RatingStars value={rating} onChange={handleRatingChange} hideClearButton />
          {initialLog?.rating !== null && initialLog?.rating !== undefined && (
            <button
              type="button"
              onClick={clearRating}
              aria-label="Remove rating"
              className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {ratingState?.error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {ratingState.error}
          </p>
        )}
        {clearRatingState && "error" in clearRatingState && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {clearRatingState.error}
          </p>
        )}
      </div>

      <form key={formResetKey} action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="tmdbMovieId" value={tmdbMovieId} />
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
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <label htmlFor="review" className="text-sm font-medium">
              Review (optional)
            </label>
            {initialLog?.review !== null && initialLog?.review !== undefined && (
              <button
                type="button"
                onClick={() => {
                  const formData = new FormData();
                  formData.set("tmdbMovieId", String(tmdbMovieId));
                  formData.set("field", "review");
                  startTransition(() => clearReviewAction(formData));
                }}
                disabled={clearReviewPending}
                aria-label="Remove review"
                className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <textarea
            key={initialLog?.review ? "has-review" : "no-review"}
            id="review"
            name="review"
            rows={4}
            defaultValue={initialLog?.review ?? ""}
            maxLength={2000}
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
          />
        </div>
        {state && "error" in state && (
          <p role="alert" className="text-destructive">
            {state.error}
          </p>
        )}
        {clearReviewState && "error" in clearReviewState && (
          <p role="alert" className="text-destructive">
            {clearReviewState.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer self-start rounded-md bg-accent px-4 py-2 text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : initialLog ? "Update log" : "Log movie"}
        </button>
      </form>

      {initialLog && (
        <>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="cursor-pointer self-start rounded-md border border-destructive px-4 py-2 text-destructive"
          >
            Delete log
          </button>
          <ConfirmDialog
            open={confirmDeleteOpen}
            title="Delete this log?"
            description="This can't be undone."
            error={deleteState && "error" in deleteState ? deleteState.error : undefined}
            pending={deletePending}
            onCancel={() => setConfirmDeleteOpen(false)}
            onConfirm={() => {
              const formData = new FormData();
              formData.set("tmdbMovieId", String(tmdbMovieId));
              startTransition(() => deleteFormAction(formData));
            }}
          />
        </>
      )}
    </div>
  );
};
