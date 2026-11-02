"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleSlash, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  toggleMovieWatched,
  type ToggleMovieWatchedState,
} from "@/app/movie/[id]/actions";
import { toggleShowWatched, toggleSeasonWatched } from "@/app/tv/[id]/actions";
import type { ShowStatus } from "@/lib/validation/show-log";

type WatchedButtonProps =
  | { tmdbId: number; mediaType: "movie"; initialIsWatched: boolean }
  | {
      tmdbId: number;
      mediaType: "tv";
      initialIsWatched: boolean;
      /** Saved show status; picks the "Completed" vs "Dropped" label. */
      showStatus?: ShowStatus | null;
    }
  | {
      tmdbId: number;
      mediaType: "season";
      seasonNumber: number;
      initialIsWatched: boolean;
    };

const ON_CLASS =
  "flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent transition-colors hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50";
// Dropped is a state, not an error or an achievement: neither red nor gold.
// Same pressed anatomy as ON_CLASS (tinted border + fill + text), in the
// neutral foreground colour, so it still reads as selected.
const DROPPED_CLASS =
  "flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/40 bg-foreground/10 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-foreground hover:bg-foreground/20 disabled:cursor-not-allowed disabled:opacity-50";
const OFF_CLASS =
  "flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

export const WatchedButton = (props: WatchedButtonProps) => {
  const { tmdbId, mediaType, initialIsWatched } = props;
  const isShow = mediaType === "tv";
  const dropped = isShow && props.showStatus === "dropped";
  const action =
    mediaType === "movie"
      ? toggleMovieWatched
      : mediaType === "tv"
        ? toggleShowWatched
        : toggleSeasonWatched;
  const [state, formAction, pending] = useActionState<
    ToggleMovieWatchedState,
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
        isShow
          ? state.isWatched
            ? "Marked as completed"
            : "Removed"
          : state.isWatched
            ? "Marked as watched"
            : "Removed from watched",
      );
      prevStateIsWatchedRef.current = state.isWatched;
    }
  }, [state, isShow]);

  const label = isShow
    ? isWatched
      ? dropped
        ? "Dropped"
        : "Completed"
      : "Mark as completed"
    : isWatched
      ? "Watched"
      : "Mark as watched";
  const Icon = isShow ? (isWatched && dropped ? CircleSlash : CircleCheck) : Eye;
  const className = !isWatched ? OFF_CLASS : dropped ? DROPPED_CLASS : ON_CLASS;

  return (
    <form action={formAction} className="flex flex-col gap-1 self-start">
      <input
        type="hidden"
        name={mediaType === "movie" ? "tmdbMovieId" : "tmdbShowId"}
        value={tmdbId}
      />
      {mediaType === "season" && (
        <input type="hidden" name="seasonNumber" value={props.seasonNumber} />
      )}
      <input type="hidden" name="isWatched" value={String(isWatched)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={isWatched}
        aria-label={label}
        className={className}
      >
        <Icon className="size-4" aria-hidden />
        {label}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
};
