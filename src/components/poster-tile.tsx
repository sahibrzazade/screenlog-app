"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";
import { posterUrl } from "@/lib/tmdb/images";

type PosterTileProps = {
  title: string;
  posterPath: string | null;
  onRemove?: () => void;
  /** Spread onto the poster box to make it a drag handle (e.g. dnd-kit's attributes + listeners). */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
};

/** A single poster-sized showcase card: the poster (or a title fallback), with an optional remove button. */
export const PosterTile = ({
  title,
  posterPath,
  onRemove,
  dragHandleProps,
}: PosterTileProps) => {
  const poster = posterUrl(posterPath, "w154");

  return (
    <div className="relative">
      <div
        {...dragHandleProps}
        title={title}
        className={`aspect-[2/3] w-full overflow-hidden rounded-md bg-surface ${
          dragHandleProps ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {poster ? (
          <div className="relative h-full w-full">
            <Image src={poster} alt={title} fill sizes="25vw" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-subtle-foreground">
            {title}
          </div>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="absolute top-1 right-1 cursor-pointer rounded-full bg-background/80 p-0.5 text-foreground transition-colors hover:text-destructive"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};

type EmptySlotProps = {
  onClick: () => void;
  label: string;
};

/** A dashed-border poster-sized "+" placeholder that opens a picker when clicked. */
export const EmptySlot = ({ onClick, label }: EmptySlotProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="flex aspect-[2/3] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
  >
    <Plus className="size-6" aria-hidden />
  </button>
);
