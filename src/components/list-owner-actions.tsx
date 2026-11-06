"use client";

import { startTransition, useActionState, useState } from "react";
import { toast } from "sonner";
import { deleteList, updateList, type ListActionState } from "@/app/list-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListFormDialog } from "@/components/list-form-dialog";
import type { ListDetails } from "@/lib/lists";

/** The owner's Edit and Delete buttons. A successful delete redirects on the server. */
export const ListOwnerActions = ({ list }: { list: ListDetails }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<ListActionState, FormData>(deleteList, {});

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-haspopup="dialog"
        className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-haspopup="dialog"
        className="cursor-pointer rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Delete
      </button>

      {editOpen && (
        <ListFormDialog
          dialogTitle="Edit list"
          submitLabel="Save changes"
          action={updateList}
          list={list}
          onSuccess={() => {
            toast.success("Changes saved");
            setEditOpen(false);
          }}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${list.title}"?`}
        description="This can't be undone."
        error={deleteState.error}
        pending={deletePending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("listId", list.id);
          startTransition(() => deleteAction(formData));
        }}
      />
    </div>
  );
};
