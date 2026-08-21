"use client";

import { useActionState, useEffect, useRef } from "react";
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
        className="self-start rounded border border-neutral-400 px-4 py-2 disabled:opacity-50"
      >
        {state.inWatchlist ? "In watchlist" : "Add to watchlist"}
      </button>
      {state.error && (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
};
