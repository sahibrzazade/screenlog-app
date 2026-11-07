"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { ListActionState } from "@/app/list-actions";
import { LIST_DESCRIPTION_MAX, LIST_TITLE_MAX } from "@/lib/validation/list";

type ListFormDialogProps = {
  dialogTitle: string;
  submitLabel: string;
  action: (state: ListActionState, formData: FormData) => Promise<ListActionState>;
  /** Editing: the list's id and current values. */
  list?: { id: string; title: string; description: string | null };
  onSuccess: (listId: string) => void;
  onClose: () => void;
};

const FIELD_CLASS =
  "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none aria-invalid:border-destructive";

/**
 * Create or edit a list's title and description. The parent mounts it to open
 * and unmounts it to close, so reopening starts from fresh values. The fields
 * are controlled because React resets a form when its action finishes, which
 * would wipe what the user typed on a server error. A click outside doesn't
 * close it, for the same reason: it would lose what was typed.
 */
export const ListFormDialog = ({ dialogTitle, submitLabel, action, list, onSuccess, onClose }: ListFormDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const baseId = useId();
  const [title, setTitle] = useState(list?.title ?? "");
  const [description, setDescription] = useState(list?.description ?? "");

  const [state, formAction, pending] = useActionState<ListActionState, FormData>(async (previous, formData) => {
    const next = await action(previous, formData);
    if (next.listId) onSuccess(next.listId);
    return next;
  }, {});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (state.field === "title") titleRef.current?.focus();
    if (state.field === "description") descriptionRef.current?.focus();
  }, [state]);

  const titleError = state.field === "title" ? state.error : undefined;
  const descriptionError = state.field === "description" ? state.error : undefined;
  const formError = state.field ? undefined : state.error;
  const titleErrorId = `${baseId}-name-error`;
  const descriptionErrorId = `${baseId}-description-error`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${baseId}-title`}
      onClose={onClose}
      className="m-auto w-[min(92vw,28rem)] rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 id={`${baseId}-title`} className="text-base font-semibold">
          {dialogTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4 p-5">
        {list && <input type="hidden" name="listId" value={list.id} />}
        <div>
          <label htmlFor={`${baseId}-name`} className="mb-1 block text-sm font-medium">
            Title
          </label>
          <input
            ref={titleRef}
            id={`${baseId}-name`}
            name="title"
            required
            maxLength={LIST_TITLE_MAX}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? titleErrorId : undefined}
            className={FIELD_CLASS}
          />
          {titleError && (
            <p id={titleErrorId} role="alert" className="mt-1 text-sm text-destructive">
              {titleError}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${baseId}-description`} className="mb-1 block text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            ref={descriptionRef}
            id={`${baseId}-description`}
            name="description"
            rows={4}
            maxLength={LIST_DESCRIPTION_MAX}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={descriptionError ? true : undefined}
            aria-describedby={descriptionError ? descriptionErrorId : undefined}
            className={FIELD_CLASS}
          />
          {descriptionError && (
            <p id={descriptionErrorId} role="alert" className="mt-1 text-sm text-destructive">
              {descriptionError}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer self-start rounded-md bg-accent px-4 py-2 text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </form>
    </dialog>
  );
};
