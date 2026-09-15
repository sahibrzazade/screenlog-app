"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmptySlot, PosterTile } from "@/components/poster-tile";
import { SearchPickerPanel } from "@/components/search-picker-panel";
import type { MediaCardItem } from "@/components/media-card";
import type { UpdateShowcaseState } from "@/app/settings/actions";

const SHOWCASE_LIMIT = 4;

type SortableThumbProps = {
  item: MediaCardItem;
  onRemove: () => void;
};

const SortableThumb = ({ item, onRemove }: SortableThumbProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`touch-none ${isDragging ? "opacity-50" : ""}`}
    >
      <PosterTile
        title={item.title}
        posterPath={item.posterPath}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

type ShowcaseEditorProps = {
  mediaType: "movie" | "tv";
  label: string;
  initialItems: MediaCardItem[];
  action: (
    state: UpdateShowcaseState,
    formData: FormData,
  ) => Promise<UpdateShowcaseState>;
};

/**
 * Editable top-4 showcase: always renders 4 cells — filled ones are
 * drag-to-reorder posters (mouse/touch/keyboard, via dnd-kit), empty ones are
 * "+" placeholders that open a closable search panel. Every change persists
 * immediately (matches the rest of the app's save-on-change forms).
 */
export const ShowcaseEditor = ({
  mediaType,
  label,
  initialItems,
  action,
}: ShowcaseEditorProps) => {
  const [items, setItems] = useState(initialItems);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [state, formAction] = useActionState<UpdateShowcaseState, FormData>(
    action,
    undefined,
  );
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && "success" in state) toast.success(`${label} updated`);
  }, [state, label]);

  // Focus the search input once it actually mounts (opening is what renders it).
  useEffect(() => {
    if (isPickerOpen) pickerRef.current?.focus();
  }, [isPickerOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = (next: MediaCardItem[]) => {
    setItems(next);
    const formData = new FormData();
    formData.set("ids", JSON.stringify(next.map((item) => item.id)));
    startTransition(() => formAction(formData));
  };

  const handleSelect = (item: MediaCardItem) => {
    if (items.length >= SHOWCASE_LIMIT || items.some((i) => i.id === item.id)) return;
    persist([...items, item]);
  };

  const handleRemove = (id: number) => {
    persist(items.filter((item) => item.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    persist(arrayMove(items, oldIndex, newIndex));
  };

  const emptySlots = SHOWCASE_LIMIT - items.length;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{label}</h3>

      <div className="grid grid-cols-4 gap-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={horizontalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableThumb key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
            ))}
          </SortableContext>
        </DndContext>
        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptySlot
            key={`empty-${index}`}
            label={`Add a ${mediaType === "movie" ? "movie" : "TV show"}`}
            onClick={() => setIsPickerOpen(true)}
          />
        ))}
      </div>

      {state && "error" in state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      {isPickerOpen && emptySlots > 0 && (
        <SearchPickerPanel
          ref={pickerRef}
          mediaType={mediaType}
          excludeIds={items.map((item) => item.id)}
          onSelect={handleSelect}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
};
