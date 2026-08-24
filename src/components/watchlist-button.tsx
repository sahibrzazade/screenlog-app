"use client";

import { useActionState, useEffect, useRef } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import {
  toggleWatchlist,
  type ToggleWatchlistState,
} from "@/app/watchlist/actions";

type WatchlistButtonProps = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  initialInWatchlist: boolean;
  onToggle?: (inWatchlist: boolean) => void;
};

export const WatchlistButton = ({
  tmdbId,
  mediaType,
  initialInWatchlist,
  onToggle,
}: WatchlistButtonProps) => {
  const [state, formAction, pending] = useActionState<
    ToggleWatchlistState,
    FormData
  >(toggleWatchlist, { inWatchlist: initialInWatchlist });
  const prevInWatchlistRef = useRef(initialInWatchlist);

  useEffect(() => {
    if (state.error) return;
    if (state.inWatchlist !== prevInWatchlistRef.current) {
      toast.success(
        state.inWatchlist ? "Added to watchlist" : "Removed from watchlist",
      );
      prevInWatchlistRef.current = state.inWatchlist;
      onToggle?.(state.inWatchlist);
    }
  }, [state, onToggle]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="tmdbId" value={tmdbId} />
      <input type="hidden" name="mediaType" value={mediaType} />
      <input
        type="hidden"
        name="inWatchlist"
        value={String(state.inWatchlist)}
      />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={state.inWatchlist}
        aria-label={state.inWatchlist ? "In watchlist" : "Add to watchlist"}
        className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-black/60 text-foreground backdrop-blur-sm transition-all hover:scale-105 hover:border-white/20 disabled:opacity-50 disabled:hover:scale-100"
      >
        {state.inWatchlist ? (
          <BookmarkCheck className="size-4.5 fill-accent text-accent" />
        ) : (
          <Bookmark className="size-4.5" />
        )}
      </button>
      {state.error && (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
};
