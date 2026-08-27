"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

  // The displayed/submitted state tracks initialIsWatched directly, not
  // state.isWatched, because the log can also become watched/unwatched from
  // outside this button (e.g. rating a star elsewhere on the page creates
  // the log row). state.isWatched only reflects what THIS button last did,
  // so relying on it alone left the button stale until a full page refresh.
  const [isWatched, setIsWatched] = useState(initialIsWatched);
  const [prevInitialIsWatched, setPrevInitialIsWatched] = useState(initialIsWatched);
  if (initialIsWatched !== prevInitialIsWatched) {
    setPrevInitialIsWatched(initialIsWatched);
    setIsWatched(initialIsWatched);
  }

  const prevStateIsWatchedRef = useRef(initialIsWatched);
  useEffect(() => {
    if (state.error) return;
    if (state.isWatched !== prevStateIsWatchedRef.current) {
      toast.success(
        state.isWatched ? "Marked as watched" : "Removed from watched",
      );
      prevStateIsWatchedRef.current = state.isWatched;
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-1 self-start">
      <input
        type="hidden"
        name={mediaType === "movie" ? "tmdbMovieId" : "tmdbShowId"}
        value={tmdbId}
      />
      <input type="hidden" name="isWatched" value={String(isWatched)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={isWatched}
        aria-label={isWatched ? "Watched" : "Mark as watched"}
        className={
          isWatched
            ? "flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            : "flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <Eye className="size-4" />
        {isWatched ? "Watched" : "Mark as watched"}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
};
