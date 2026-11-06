"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ListPlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addListItem, createList, removeTitleFromList } from "@/app/list-actions";
import { getListMemberships, type ListMembership } from "@/lib/list-membership";
import { createClient } from "@/lib/supabase/client";
import { LIST_ITEM_MAX, LIST_TITLE_MAX } from "@/lib/validation/list";

const SKELETON_ROWS = 3;

type TitleProps = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  viewerId: string;
};

type NewListFormProps = {
  /** Open with the field focused only when the user asked for it. */
  autoFocus: boolean;
  onCreated: (list: { id: string; title: string }) => Promise<void>;
};

/** Just a title: a description can be added later from the list's Edit. */
const NewListForm = ({ autoFocus, onCreated }: NewListFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("title", title);
    const result = await createList({}, formData);

    if (result.listId) {
      await onCreated({ id: result.listId, title: title.trim() });
      setTitle("");
    } else {
      setError(result.error ?? "Failed to create the list. Please try again.");
      inputRef.current?.focus();
    }
    setPending(false);
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor={`${baseId}-title`} className="mb-1 block text-sm font-medium">
        Title
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={`${baseId}-title`}
          required
          maxLength={LIST_TITLE_MAX}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${baseId}-error` : undefined}
          className="w-full min-w-0 rounded-md border border-border bg-surface px-3 py-1.5 text-foreground focus:border-accent focus:outline-none aria-invalid:border-destructive"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 cursor-pointer rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
      {error && (
        <p id={`${baseId}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
};

/**
 * The viewer's lists with a checkbox each, saved on every change. Mounted to
 * open, so each opening loads fresh lists. Nothing is lost closing it, so a
 * click outside closes it too.
 */
const AddToListDialog = ({ tmdbId, mediaType, title, viewerId, onClose }: TitleProps & { onClose: () => void }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [lists, setLists] = useState<ListMembership[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [formRequested, setFormRequested] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let current = true;
    getListMemberships(createClient(), viewerId, tmdbId, mediaType).then(
      (loaded) => {
        if (current) setLists(loaded);
      },
      () => {
        if (current) setLoadFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [viewerId, tmdbId, mediaType]);

  const setRow = (listId: string, contains: boolean) => {
    setLists((rows) =>
      (rows ?? []).map((row) =>
        row.id === listId && row.contains !== contains
          ? { ...row, contains, itemCount: row.itemCount + (contains ? 1 : -1) }
          : row,
      ),
    );
  };

  const setPending = (listId: string, pending: boolean) => {
    setPendingIds((ids) => {
      const next = new Set(ids);
      if (pending) next.add(listId);
      else next.delete(listId);
      return next;
    });
  };

  const toggle = async (list: ListMembership) => {
    const contains = !list.contains;
    setPending(list.id, true);
    setRow(list.id, contains);

    const result = contains
      ? await addListItem(list.id, { tmdbId, mediaType })
      : await removeTitleFromList(list.id, { tmdbId, mediaType });

    if (result.error) {
      setRow(list.id, !contains);
      toast.error(result.error);
    }
    setPending(list.id, false);
  };

  const handleCreated = async (created: { id: string; title: string }) => {
    const result = await addListItem(created.id, { tmdbId, mediaType });
    if (result.error) toast.error(result.error);
    const added = !result.error;
    setLists((rows) => [
      { id: created.id, title: created.title, itemCount: added ? 1 : 0, contains: added },
      ...(rows ?? []),
    ]);
    setFormRequested(false);
  };

  const noLists = lists?.length === 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex w-96 max-w-[calc(100vw-2rem)] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              Add to list
            </h2>
            <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div aria-busy={!lists && !loadFailed} className="max-h-[50vh] overflow-y-auto p-2">
          {loadFailed && (
            <p role="alert" className="p-3 text-sm text-destructive">
              Couldn&apos;t load your lists. Please try again.
            </p>
          )}

          {!lists && !loadFailed && (
            <ul aria-hidden="true" className="flex flex-col gap-1">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={index} className="flex min-h-11 items-center gap-3 px-3">
                  <div className="size-4 shrink-0 animate-pulse rounded bg-surface" />
                  <div className="h-4 w-40 animate-pulse rounded bg-surface" />
                </li>
              ))}
            </ul>
          )}

          {noLists && <p className="p-3 text-sm text-muted-foreground">You don&apos;t have any lists yet.</p>}

          {lists && lists.length > 0 && (
            <ul className="flex flex-col gap-1">
              {lists.map((list) => {
                // A full list can still lose this title, but can't gain it.
                const full = list.itemCount >= LIST_ITEM_MAX && !list.contains;
                const disabled = full || pendingIds.has(list.id);
                return (
                  <li key={list.id}>
                    <label
                      className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        full ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer hover:bg-surface"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={list.contains}
                        disabled={disabled}
                        onChange={() => void toggle(list)}
                        className="size-4 shrink-0 cursor-pointer accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{list.title}</span>
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {full ? "Full" : `${list.itemCount} ${list.itemCount === 1 ? "title" : "titles"}`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lists && (
          <div className="border-t border-border p-3">
            {noLists || formRequested ? (
              <NewListForm autoFocus={formRequested} onCreated={handleCreated} />
            ) : (
              <button
                type="button"
                onClick={() => setFormRequested(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" aria-hidden />
                New list
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
};

/** Sidebar button on movie and show pages, for signed-in viewers. */
export const AddToListButton = (props: TitleProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ListPlus className="size-4" aria-hidden />
        Add to list
      </button>
      {open && <AddToListDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
};
