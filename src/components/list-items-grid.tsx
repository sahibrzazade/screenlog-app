"use client";

import { startTransition, useOptimistic } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { removeListItem, restoreListItem } from "@/app/list-actions";
import { MediaCard } from "@/components/media-card";
import type { ListItem } from "@/lib/lists";

type ListItemsGridProps = {
  listId: string;
  items: ListItem[];
  /** Owner view: each poster gets a remove button. */
  editable: boolean;
};

/**
 * A list's titles in order, numbered. The ordered list gives screen readers
 * the numbers, so the visual badges are hidden from them. Removing is
 * optimistic: the transition ending puts a failed removal back. It has no
 * confirmation, so its toast offers Undo, which also keeps the title's rank.
 */
export const ListItemsGrid = ({ listId, items, editable }: ListItemsGridProps) => {
  const [visibleItems, removeOptimistically] = useOptimistic(items, (current, removedId: string) =>
    current.filter((item) => item.itemId !== removedId),
  );

  const undoRemove = async (item: ListItem) => {
    const result = await restoreListItem(listId, {
      tmdbId: item.id,
      mediaType: item.mediaType,
      position: item.position,
    });
    if (result.error) toast.error(result.error);
  };

  const remove = (item: ListItem) => {
    startTransition(async () => {
      removeOptimistically(item.itemId);
      const result = await removeListItem(listId, item.itemId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Removed from list", {
          action: { label: "Undo", onClick: () => void undoRemove(item) },
        });
      }
    });
  };

  return (
    <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {visibleItems.map((item, index) => (
        <li key={item.itemId} className="relative">
          <MediaCard id={item.id} mediaType={item.mediaType} title={item.title} year={item.year} posterPath={item.posterPath} />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-background/85 px-1 text-xs font-medium text-foreground tabular-nums backdrop-blur-sm"
          >
            {index + 1}
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => remove(item)}
              aria-label={`Remove ${item.title} from list`}
              // after: widens the 32px circle's hit area to 44px for touch.
              className="absolute top-1.5 right-1.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-sm transition-colors after:absolute after:-inset-1.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </li>
      ))}
    </ol>
  );
};
