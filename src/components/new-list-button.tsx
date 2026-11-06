"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createList } from "@/app/list-actions";
import { ListFormDialog } from "@/components/list-form-dialog";

/** Opens the new-list form; a created list opens straight away. */
export const NewListButton = ({ username }: { username: string }) => {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" aria-hidden />
        New list
      </button>
      {open && (
        <ListFormDialog
          dialogTitle="New list"
          submitLabel="Create list"
          action={createList}
          onSuccess={(listId) => {
            toast.success("List created");
            router.push(`/user/${username}/lists/${listId}`);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
