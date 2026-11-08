"use client";

import Image from "next/image";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RatingStars } from "@/components/rating-stars";
import { WatchedButton } from "@/components/watched-button";
import { todayIso } from "@/lib/date";
import { formatWatchDate } from "@/lib/diary-dates";
import type { MutationState, RatingState } from "@/lib/logs/mutations";
import type { ShowStatus } from "@/lib/validation/show-log";

type MutationAction = (
  state: MutationState,
  formData: FormData,
) => Promise<MutationState>;
type RatingAction = (
  state: RatingState,
  formData: FormData,
) => Promise<RatingState>;

type LogData = {
  id: string;
  rating: number | null;
  review: string | null;
  watchedDate: string;
  /** Shows only (completed / dropped). */
  status?: ShowStatus;
};

type Watch = LogData & { rewatch: boolean };

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
  /**
   * Shows only: adds an "I dropped this show" checkbox to the modal; while
   * checked the date field is labelled "Date dropped".
   */
  droppable?: boolean;
  /** Label on the submit button when creating a log (e.g. "Save"). */
  submitLabel: string;
  /** The watch the card shows (for movies and seasons, the latest); its id goes with every write. */
  initialLog: LogData | null;
  /**
   * Movies and seasons only: every watch, latest first. Turns on rewatches —
   * "Log again", the "I've watched this before" checkbox and, from two
   * watches, the "Watched N times" list.
   */
  watches?: Watch[];
  actions: {
    log: MutationAction;
    deleteLog: MutationAction;
    setRating: RatingAction;
    clearField: MutationAction;
  };
};

/** Which log the modal edits: the card's, a watch from the list, or a new watch. */
type ModalTarget = "current" | "new" | { watchId: string };

/**
 * Shared movie/show/season "log" widget: a compact sidebar card (watched
 * toggle + star rating + edit/delete) that opens a modal for the full log form
 * (watched date + optional review). Movies and seasons can be logged more
 * than once: the card shows the latest watch, "Log again" adds one, and the
 * "Watched N times" list opens any earlier watch in the same modal.
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
  droppable = false,
  submitLabel,
  initialLog,
  watches,
  actions,
}: LogTitleFormProps) => {
  const rewatchable = watches !== undefined;
  const watchCount = watches?.length ?? 0;

  // Mirrors the (uncontrolled) checkbox, only to relabel the date field before
  // saving. Resyncs when the saved status changes (save, delete) — same
  // prop-sync pattern as rating.
  const savedDropped = initialLog?.status === "dropped";
  const [dropped, setDropped] = useState(savedDropped);
  const [prevSavedDropped, setPrevSavedDropped] = useState(savedDropped);
  if (savedDropped !== prevSavedDropped) {
    setPrevSavedDropped(savedDropped);
    setDropped(savedDropped);
  }

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
  // Whether the last form submission added a watch, for its toast.
  const submittedNewWatchRef = useRef(false);
  // Bumped only on a real delete, to reset the date/review form fields.
  const [formResetKey, setFormResetKey] = useState(0);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  // Stars in the modal for a new watch (saved with the form) or an earlier
  // watch (saved on click, but not the card's rating).
  const [modalRating, setModalRating] = useState<number | null>(null);
  const [watchListOpen, setWatchListOpen] = useState(false);
  // The log the confirm dialog deletes (the card's or the modal's).
  const [deleteTarget, setDeleteTarget] = useState<LogData | null>(null);
  const modalRef = useRef<HTMLDialogElement>(null);
  const watchListId = useId();
  const extraFieldsSuffix = Object.values(extraFields ?? {}).join("-");
  const formId = `${formIdPrefix}-${tmdbId}${extraFieldsSuffix ? `-${extraFieldsSuffix}` : ""}`;

  const modalOpen = modalTarget !== null;
  const isNewWatch = modalTarget === "new";
  const modalLog: LogData | null =
    modalTarget === null || modalTarget === "new"
      ? null
      : modalTarget === "current"
        ? initialLog
        : (watches?.find((watch) => watch.id === modalTarget.watchId) ?? initialLog);
  const modalWatch = watches?.find((watch) => watch.id === modalLog?.id);
  // The card's own log: its stars share the card's rating state.
  const modalIsCardLog = !isNewWatch && (modalLog === null || modalLog.id === initialLog?.id);

  /** Adds the title's ids (and the log's, when there is one) to a request. */
  const withIds = (formData: FormData, log: LogData | null = initialLog) => {
    formData.set(idField, String(tmdbId));
    for (const [key, value] of Object.entries(extraFields ?? {})) {
      formData.set(key, String(value));
    }
    if (log) formData.set("logId", log.id);
    return formData;
  };

  const openModal = (target: ModalTarget) => {
    const log =
      target === "new"
        ? null
        : target === "current"
          ? initialLog
          : (watches?.find((watch) => watch.id === target.watchId) ?? null);
    setModalRating(log?.rating ?? null);
    setModalTarget(target);
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

  // A new watch, once saved, is an ordinary watch: close its (empty) modal so
  // a second save can't add it twice.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state && "success" in state && modalTarget === "new") {
      setModalTarget(null);
    }
  }

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(
        submittedNewWatchRef.current ? "Watch added" : wasExistingLogRef.current ? "Changes saved" : "Saved",
      );
      wasExistingLogRef.current = true;
    }
  }, [state]);

  useEffect(() => {
    if (deleteState && "success" in deleteState) {
      toast.success("Deleted");
      wasExistingLogRef.current = watchCount > 1;
    }
    // Only a new delete result should toast, not a changed watch count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  const [prevDeleteState, setPrevDeleteState] = useState(deleteState);
  if (deleteState !== prevDeleteState) {
    setPrevDeleteState(deleteState);
    if (deleteState && "success" in deleteState) {
      setFormResetKey((k) => k + 1);
      setDeleteTarget(null);
      setModalTarget(null);
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

  const saveRating = (value: number, log: LogData | null) => {
    ratingDispatchedRef.current = true;
    const formData = withIds(new FormData(), log);
    formData.set("rating", String(value));
    startTransition(() => ratingAction(formData));
  };

  const handleCardRatingChange = (value: number | null) => {
    if (value === null) return;
    setRating(value);
    saveRating(value, initialLog);
  };

  const handleModalRatingChange = (value: number | null) => {
    if (value === null) return;
    if (modalIsCardLog) {
      handleCardRatingChange(value);
      return;
    }
    setModalRating(value);
    // A new watch's rating is saved with the form.
    if (!isNewWatch) saveRating(value, modalLog);
  };

  const clearRating = (log: LogData | null) => {
    const formData = withIds(new FormData(), log);
    formData.set("field", "rating");
    startTransition(() => clearRatingAction(formData));
  };

  const clearModalRating = () => {
    if (modalIsCardLog) {
      clearRating(initialLog);
      return;
    }
    setModalRating(null);
    if (!isNewWatch) clearRating(modalLog);
  };

  const hasRating = initialLog?.rating !== null && initialLog?.rating !== undefined;
  const modalRatingValue = modalIsCardLog ? rating : modalRating;
  const modalHasRating = modalIsCardLog ? hasRating : modalRating !== null;
  const ratingErrorMessage =
    ratingState?.error ??
    (clearRatingState && "error" in clearRatingState ? clearRatingState.error : undefined);

  // Movies and seasons: the modal says whether it adds a watch or which one it
  // edits, so "Log again" and "Edit review" never look alike.
  const modalSubtitle = isNewWatch
    ? "New watch"
    : rewatchable && modalLog
      ? `Watched ${formatWatchDate(modalLog.watchedDate)}`
      : null;

  // Shows read "Completed" / "Dropped"; movies and seasons "Watched".
  const watchedControl =
    mediaType === "tv" ? (
      <WatchedButton
        tmdbId={tmdbId}
        mediaType="tv"
        initialIsWatched={initialLog !== null}
        showStatus={initialLog?.status ?? null}
      />
    ) : mediaType === "season" ? (
      <WatchedButton
        tmdbId={tmdbId}
        mediaType="season"
        seasonNumber={seasonNumber!}
        initialIsWatched={initialLog !== null}
      />
    ) : (
      <WatchedButton tmdbId={tmdbId} mediaType="movie" initialIsWatched={initialLog !== null} />
    );

  return (
    <>
      <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-3">
        {watchedControl}

        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Your Rating</span>
          <div className="flex items-center gap-1">
            <RatingStars
              name={`rating-card-${tmdbId}`}
              value={rating}
              onChange={handleCardRatingChange}
              hideClearButton
              compact
            />
            {hasRating && (
              <button
                type="button"
                onClick={() => clearRating(initialLog)}
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
          onClick={() => openModal("current")}
          className="cursor-pointer self-stretch rounded-md bg-accent px-3 py-1.5 text-center text-sm text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          {initialLog ? "Edit review" : "Rate & review"}
        </button>

        {rewatchable && initialLog && (
          <button
            type="button"
            onClick={() => openModal("new")}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 self-stretch rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Log again
          </button>
        )}

        {/* With several watches it's unclear which one this would delete; each is deleted from its modal. */}
        {initialLog && watchCount < 2 && (
          <button
            type="button"
            onClick={() => setDeleteTarget(initialLog)}
            className="cursor-pointer self-stretch rounded-md border border-destructive px-3 py-1.5 text-center text-sm text-destructive"
          >
            Delete
          </button>
        )}

        {watches && watchCount > 1 && (
          <div className="self-stretch">
            <button
              type="button"
              aria-expanded={watchListOpen}
              aria-controls={watchListId}
              onClick={() => setWatchListOpen((open) => !open)}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Watched {watchCount} times
              <ChevronDown
                className={`size-4 transition-transform ${watchListOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {watchListOpen && (
              <ul id={watchListId} className="flex flex-col">
                {watches.map((watch) => (
                  <li key={watch.id}>
                    <button
                      type="button"
                      onClick={() => openModal({ watchId: watch.id })}
                      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>
                        <span className="sr-only">Edit watch of </span>
                        {formatWatchDate(watch.watchedDate)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {watch.rating !== null ? (
                          <RatingStars value={watch.rating} readOnly small />
                        ) : (
                          <span className="text-xs text-muted-foreground">Watched</span>
                        )}
                        {watch.rewatch && (
                          <>
                            <RotateCcw className="size-3.5 text-muted-foreground" aria-hidden />
                            <span className="sr-only">Rewatch</span>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <dialog
        ref={modalRef}
        onClose={() => setModalTarget(null)}
        onClick={(event) => {
          if (event.target === modalRef.current) setModalTarget(null);
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
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {modalSubtitle && <p className="text-sm text-muted-foreground">{modalSubtitle}</p>}
              </div>
              <button
                type="button"
                onClick={() => setModalTarget(null)}
                aria-label="Close"
                className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {!isNewWatch && watchedControl}

            <div>
              <span className="mb-1 block text-sm font-medium">Rating</span>
              <div className="flex items-center gap-2">
                <RatingStars
                  name={`rating-modal-${tmdbId}`}
                  value={modalRatingValue}
                  onChange={handleModalRatingChange}
                  hideClearButton
                />
                {modalHasRating && (
                  <button
                    type="button"
                    onClick={clearModalRating}
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

            <form
              // A different watch (or a new one) gets fresh field defaults.
              key={`${formResetKey}-${isNewWatch ? "new" : (modalLog?.id ?? "none")}`}
              id={formId}
              action={formAction}
              onSubmit={() => {
                submittedNewWatchRef.current = isNewWatch;
              }}
              className="flex flex-col gap-4"
            >
              <input type="hidden" name={idField} value={tmdbId} />
              {modalLog && <input type="hidden" name="logId" value={modalLog.id} />}
              {isNewWatch && <input type="hidden" name="newWatch" value="1" />}
              {isNewWatch && modalRating !== null && <input type="hidden" name="rating" value={modalRating} />}
              {Object.entries(extraFields ?? {}).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <div>
                <label htmlFor="watchedDate" className="mb-1 block text-sm font-medium">
                  {droppable && dropped ? "Date dropped" : watchedDateLabel}
                </label>
                <input
                  id="watchedDate"
                  name="watchedDate"
                  type="date"
                  required
                  defaultValue={modalLog?.watchedDate ?? todayIso()}
                  max={todayIso()}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              {rewatchable && (
                <div>
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
                    {/* Uncontrolled, like the dropped checkbox below: the form's
                        key resets it to this watch's saved value. */}
                    <input
                      type="checkbox"
                      name="rewatch"
                      defaultChecked={isNewWatch || (modalWatch?.rewatch ?? false)}
                      aria-describedby={`${formId}-rewatch-hint`}
                      className="size-4 cursor-pointer accent-accent"
                    />
                    I&apos;ve watched this before
                  </label>
                  <p id={`${formId}-rewatch-hint`} className="mt-1 text-xs text-muted-foreground">
                    Marks this as a rewatch.
                  </p>
                </div>
              )}
              {droppable && (
                <div>
                  <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
                    {/* Uncontrolled on purpose: React 19 resets the form after a
                        successful action, which would desync a controlled
                        checkbox from its state. defaultChecked follows the
                        saved status, so the reset lands on the saved value. */}
                    <input
                      type="checkbox"
                      name="dropped"
                      defaultChecked={savedDropped}
                      onChange={(event) => setDropped(event.target.checked)}
                      aria-describedby={`${formId}-dropped-hint`}
                      className="size-4 cursor-pointer accent-accent"
                    />
                    I dropped this show
                  </label>
                  <p id={`${formId}-dropped-hint`} className="mt-1 text-xs text-muted-foreground">
                    Stopped watching before the end.
                  </p>
                </div>
              )}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <label htmlFor="review" className="text-sm font-medium">
                    Review (optional)
                  </label>
                  {modalLog?.review !== null && modalLog?.review !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        const formData = withIds(new FormData(), modalLog);
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
                  key={modalLog?.review ? "has-review" : "no-review"}
                  id="review"
                  name="review"
                  rows={4}
                  defaultValue={modalLog?.review ?? ""}
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
                {pending ? "Saving..." : modalLog ? "Save changes" : submitLabel}
              </button>
              {modalLog && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(modalLog)}
                  className="cursor-pointer rounded-md border border-destructive px-4 py-2 text-destructive"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </dialog>

      {deleteTarget && (
        <ConfirmDialog
          open
          title={watchCount > 1 ? "Delete this watch?" : "Delete your rating and review?"}
          description={
            watchCount > 1
              ? `Your watch of ${formatWatchDate(deleteTarget.watchedDate)} and its rating and review will be deleted. This can't be undone.`
              : "This can't be undone."
          }
          error={deleteState && "error" in deleteState ? deleteState.error : undefined}
          pending={deletePending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            startTransition(() => deleteFormAction(withIds(new FormData(), deleteTarget)));
          }}
        />
      )}
    </>
  );
};
