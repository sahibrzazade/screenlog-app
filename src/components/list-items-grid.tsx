"use client";

import { startTransition, useOptimistic } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { removeListItem, reorderListItems, restoreListItem } from "@/app/list-actions";
import { MediaCard } from "@/components/media-card";
import type { ListItem } from "@/lib/lists";

type ListItemsGridProps = {
  listId: string;
  items: ListItem[];
  /** Owner view: each poster gets a drag handle and a remove button. */
  editable: boolean;
};

type OptimisticChange = { type: "remove"; itemId: string } | { type: "reorder"; itemIds: string[] };

const applyChange = (current: ListItem[], change: OptimisticChange) =>
  change.type === "remove"
    ? current.filter((item) => item.itemId !== change.itemId)
    : change.itemIds.flatMap((id) => current.find((item) => item.itemId === id) ?? []);

const GRID_CLASS = "mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

type SortableListItemProps = {
  item: ListItem;
  position: number;
  onRemove: () => void;
};

/**
 * The position badge doubles as the drag handle, so the poster stays a plain
 * link and a phone can still scroll by swiping across it.
 */
const SortableListItem = ({ item, position, onRemove }: SortableListItemProps) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.itemId,
  });

  return (
    <li
      ref={setNodeRef}
      // Translate, not Transform: cards differ in height, and scaling would distort them.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative ${isDragging ? "z-20 opacity-80" : ""}`}
    >
      <MediaCard id={item.id} mediaType={item.mediaType} title={item.title} year={item.year} posterPath={item.posterPath} />
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${item.title}, position ${position}`}
        // after: widens the 32px pill's hit area to 44px for touch.
        className="absolute top-1.5 left-1.5 z-10 flex h-8 cursor-grab touch-none items-center rounded-full bg-background/85 pr-2 pl-1 text-xs font-medium text-foreground tabular-nums backdrop-blur-sm after:absolute after:-inset-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="size-4 text-muted-foreground" aria-hidden />
        {position}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.title} from list`}
        // after: widens the 32px circle's hit area to 44px for touch.
        className="absolute top-1.5 right-1.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-sm transition-colors after:absolute after:-inset-1.5 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
};

/**
 * A list's titles in order, numbered. The ordered list gives screen readers
 * the numbers, so the visitor view's badges are hidden from them. Removing and
 * reordering are optimistic: the transition ending puts back a change that
 * failed. Removing has no confirmation, so its toast offers Undo, which also
 * keeps the title's rank.
 */
export const ListItemsGrid = ({ listId, items, editable }: ListItemsGridProps) => {
  const [visibleItems, applyOptimistically] = useOptimistic(items, applyChange);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      applyOptimistically({ type: "remove", itemId: item.itemId });
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const itemIds = visibleItems.map((item) => item.itemId);
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(itemIds, oldIndex, newIndex);
    startTransition(async () => {
      applyOptimistically({ type: "reorder", itemIds: reordered });
      // Unlike a returned error, a lost connection throws.
      const result = await reorderListItems(listId, reordered).catch(() => ({
        error: "Couldn't save the new order. Please try again.",
      }));
      if (result.error) toast.error(result.error);
    });
  };

  if (!editable) {
    return (
      <ol className={GRID_CLASS}>
        {visibleItems.map((item, index) => (
          <li key={item.itemId} className="relative">
            <MediaCard id={item.id} mediaType={item.mediaType} title={item.title} year={item.year} posterPath={item.posterPath} />
            <span
              aria-hidden
              className="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-background/85 px-1 text-xs font-medium text-foreground tabular-nums backdrop-blur-sm"
            >
              {index + 1}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  const titleOf = (id: UniqueIdentifier) => visibleItems.find((item) => item.itemId === id)?.title ?? "Title";
  const positionOf = (id: UniqueIdentifier) => visibleItems.findIndex((item) => item.itemId === id) + 1;

  // dnd-kit's defaults would read the row ids aloud.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${positionOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over position ${positionOf(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${titleOf(active.id)} moved to position ${positionOf(over.id)}.` : `${titleOf(active.id)} stayed in place.`,
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} stayed at position ${positionOf(active.id)}.`,
  };

  return (
    <DndContext
      // A fixed id keeps its aria attributes the same on the server and the client.
      id={`list-items-${listId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements }}
    >
      <SortableContext items={visibleItems.map((item) => item.itemId)} strategy={rectSortingStrategy}>
        <ol className={GRID_CLASS}>
          {visibleItems.map((item, index) => (
            <SortableListItem key={item.itemId} item={item} position={index + 1} onRemove={() => remove(item)} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
};
