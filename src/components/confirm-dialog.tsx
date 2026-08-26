"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
      className="m-auto rounded-md border border-border bg-surface-elevated p-0 text-foreground backdrop:bg-black/60"
    >
      <div className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 p-5">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
