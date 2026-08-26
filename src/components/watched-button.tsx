"use client";

import { useActionState, useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import {
  toggleMovieWatched,
  type ToggleMovieWatchedState,
} from "@/app/movie/[id]/actions";
import {
  toggleShowWatched,
  type ToggleShowWatchedState,
} from "@/app/tv/[id]/actions";

type WatchedButtonProps = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  initialIsWatched: boolean;
};

export const WatchedButton = ({
  tmdbId,
  mediaType,
  initialIsWatched,
}: WatchedButtonProps) => {
  const action = mediaType === "movie" ? toggleMovieWatched : toggleShowWatched;
  const [state, formAction, pending] = useActionState<
    ToggleMovieWatchedState | ToggleShowWatchedState,
    FormData
  >(action, { isWatched: initialIsWatched });
  const prevIsWatchedRef = useRef(initialIsWatched);

  useEffect(() => {
    if (state.error) return;
    if (state.isWatched !== prevIsWatchedRef.current) {
      toast.success(
        state.isWatched ? "Marked as watched" : "Removed from watched",
      );
      prevIsWatchedRef.current = state.isWatched;
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input
        type="hidden"
        name={mediaType === "movie" ? "tmdbMovieId" : "tmdbShowId"}
        value={tmdbId}
      />
      <input type="hidden" name="isWatched" value={String(state.isWatched)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={state.isWatched}
        aria-label={state.isWatched ? "Watched" : "Mark as watched"}
        className={
          state.isWatched
            ? "flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            : "flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <Eye className="size-4" />
        {state.isWatched ? "Watched" : "Mark as watched"}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
};
