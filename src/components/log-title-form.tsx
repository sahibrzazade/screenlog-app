"use client";

import Image from "next/image";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RatingStars } from "@/components/rating-stars";
import { WatchedButton } from "@/components/watched-button";
import { todayIso } from "@/lib/date";
import type { MutationState, RatingState } from "@/lib/logs/mutations";

type MutationAction = (
  state: MutationState,
  formData: FormData,
) => Promise<MutationState>;
type RatingAction = (
  state: RatingState,
  formData: FormData,
) => Promise<RatingState>;

type LogTitleFormProps = {
  tmdbId: number;
  /** Hidden form field the paired server actions read the id from. */
  idField: "tmdbMovieId" | "tmdbShowId";
  /**
   * Extra hidden fields every submission needs beyond `idField` — e.g.
   * `{ seasonNumber }` for a season log, which is scoped by both the show id
   * and a season number.
   */
  extraFields?: Record<string, string | number>;
  /** Prefix for the (id-scoped) `<form>` id, e.g. `log-movie-form`. */
  formIdPrefix: string;
  mediaType: "movie" | "tv" | "season";
  /** Required when `mediaType` is `"season"` — passed through to `WatchedButton`. */
  seasonNumber?: number;
  title: string;
  posterUrl: string | null;
  /** Label on the watched-date field ("Watched date" vs "Date finished"). */
  watchedDateLabel: string;
  /** Label on the submit button when creating a log ("Log movie" vs "Log show"). */
  submitLabel: string;
  initialLog: { rating: number | null; review: string | null; watchedDate: string } | null;
  actions: {
    log: MutationAction;
    deleteLog: MutationAction;
    setRating: RatingAction;
    clearField: MutationAction;
  };
};

/**
 * Shared movie/show "log" widget: a compact sidebar card (watched toggle +
 * star rating + edit/delete) that opens a modal for the full log form
 * (watched date + optional review). Movies and shows differ only in a few
 * labels and which server actions they target — passed in via props.
 */
export const LogTitleForm = ({
  tmdbId,
  idField,
  extraFields,
  formIdPrefix,
  mediaType,
  seasonNumber,
  title,
  posterUrl,
  watchedDateLabel,
  submitLabel,
  initialLog,
  actions,
}: LogTitleFormProps) => {
  const [state, formAction, pending] = useActionState<MutationState, FormData>(
    actions.log,
    undefined,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState<
    MutationState,
    FormData
  >(actions.deleteLog, undefined);
  const [ratingState, ratingAction] = useActionState<RatingState, FormData>(
    actions.setRating,
    { rating: initialLog?.rating ?? null },
  );
  const [clearRatingState, clearRatingAction] = useActionState<
    MutationState,
    FormData
  >(actions.clearField, undefined);
  const [clearReviewState, clearReviewAction, clearReviewPending] = useActionState<
    MutationState,
    FormData
  >(actions.clearField, undefined);

  const [rating, setRating] = useState<number | null>(initialLog?.rating ?? null);
  const wasExistingLogRef = useRef(initialLog !== null);
  // ratingState is seeded with a real (non-undefined) value, so the effect
  // below would otherwise fire a "Rating saved" toast on first mount even
  // though nothing was clicked. Only toast once a rating was actually set.
  const ratingDispatchedRef = useRef(false);
  // Bumped only on a real delete, to reset the date/review form fields.
  const [formResetKey, setFormResetKey] = useState(0);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const extraFieldsSuffix = Object.values(extraFields ?? {}).join("-");
  const formId = `${formIdPrefix}-${tmdbId}${extraFieldsSuffix ? `-${extraFieldsSuffix}` : ""}`;

  const setIdField = (formData: FormData) => {
    formData.set(idField, String(tmdbId));
    for (const [key, value] of Object.entries(extraFields ?? {})) {
      formData.set(key, String(value));
    }
    return formData;
  };

  useEffect(() => {
    const dialog = modalRef.current;
    if (!dialog) return;
    if (modalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!modalOpen && dialog.open) {
      dialog.close();
    }
  }, [modalOpen]);

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
      setModalOpen(false);
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
    const formData = setIdField(new FormData());
    formData.set("rating", String(value));
    startTransition(() => ratingAction(formData));
  };

  const clearRating = () => {
    const formData = setIdField(new FormData());
    formData.set("field", "rating");
    startTransition(() => clearRatingAction(formData));
  };

  const hasRating = initialLog?.rating !== null && initialLog?.rating !== undefined;
  const ratingErrorMessage =
    ratingState?.error ??
    (clearRatingState && "error" in clearRatingState ? clearRatingState.error : undefined);

  return (
    <>
      <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-3">
        {mediaType === "season" ? (
          <WatchedButton
            tmdbId={tmdbId}
            mediaType="season"
            seasonNumber={seasonNumber!}
            initialIsWatched={initialLog !== null}
          />
        ) : (
          <WatchedButton
            tmdbId={tmdbId}
            mediaType={mediaType}
            initialIsWatched={initialLog !== null}
          />
        )}

        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Your Rating</span>
          <div className="flex items-center gap-1">
            <RatingStars
              name={`rating-card-${tmdbId}`}
              value={rating}
              onChange={handleRatingChange}
              hideClearButton
              compact
            />
            {hasRating && (
              <button
                type="button"
                onClick={clearRating}
                aria-label="Remove rating"
                className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {ratingErrorMessage && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {ratingErrorMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="cursor-pointer self-stretch rounded-md bg-accent px-3 py-1.5 text-center text-sm text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          {initialLog ? "Edit log" : "Add log"}
        </button>

        {initialLog && (
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="cursor-pointer self-stretch rounded-md border border-destructive px-3 py-1.5 text-center text-sm text-destructive"
          >
            Delete log
          </button>
        )}
      </div>

      <dialog
        ref={modalRef}
        onClose={() => setModalOpen(false)}
        onClick={(event) => {
          if (event.target === modalRef.current) setModalOpen(false);
        }}
        className="m-auto w-[min(92vw,36rem)] max-h-[90vh] overflow-y-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row">
          <div className="mx-auto w-28 shrink-0 overflow-hidden rounded-md bg-surface sm:mx-0 sm:w-32 sm:self-start">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                width={128}
                height={192}
                className="h-auto w-full"
              />
            ) : (
              <div className="flex aspect-2/3 items-center justify-center text-center text-[10px] text-subtle-foreground">
                No poster
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {mediaType === "season" ? (
              <WatchedButton
                tmdbId={tmdbId}
                mediaType="season"
                seasonNumber={seasonNumber!}
                initialIsWatched={initialLog !== null}
              />
            ) : (
              <WatchedButton
                tmdbId={tmdbId}
                mediaType={mediaType}
                initialIsWatched={initialLog !== null}
              />
            )}

            <div>
              <span className="mb-1 block text-sm font-medium">Rating</span>
              <div className="flex items-center gap-2">
                <RatingStars
                  name={`rating-modal-${tmdbId}`}
                  value={rating}
                  onChange={handleRatingChange}
                  hideClearButton
                />
                {hasRating && (
                  <button
                    type="button"
                    onClick={clearRating}
                    aria-label="Remove rating"
                    className="cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              {ratingErrorMessage && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {ratingErrorMessage}
                </p>
              )}
            </div>

            <form key={formResetKey} id={formId} action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name={idField} value={tmdbId} />
              {Object.entries(extraFields ?? {}).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <div>
                <label htmlFor="watchedDate" className="mb-1 block text-sm font-medium">
                  {watchedDateLabel}
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
                        const formData = setIdField(new FormData());
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
            </form>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                form={formId}
                disabled={pending}
                className="cursor-pointer rounded-md bg-accent px-4 py-2 text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Saving..." : initialLog ? "Update log" : submitLabel}
              </button>
              {initialLog && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="cursor-pointer rounded-md border border-destructive px-4 py-2 text-destructive"
                >
                  Delete log
                </button>
              )}
            </div>
          </div>
        </div>
      </dialog>

      {initialLog && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          title="Delete this log?"
          description="This can't be undone."
          error={deleteState && "error" in deleteState ? deleteState.error : undefined}
          pending={deletePending}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            startTransition(() => deleteFormAction(setIdField(new FormData())));
          }}
        />
      )}
    </>
  );
};
