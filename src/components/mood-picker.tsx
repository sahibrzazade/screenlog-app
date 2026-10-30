"use client";

import { useEffect, useState } from "react";
import { MOODS, getMoodById, type MoodId } from "@/lib/tmdb/moods";
import { HomeSection } from "@/components/home-section";
import { MoodResults } from "@/components/mood-results";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { MediaCardItem } from "@/components/media-card";
import type { TmdbSearchResponse } from "@/lib/tmdb/types";

const RESULT_LIMIT = 12;

type MoodPickerProps = {
  userId: string | null;
  watchlistKeys: Set<string>;
};

/**
 * Click-driven mood picker. Nothing shows until a chip is clicked; clicking
 * a different chip replaces the previous results, not appends to them.
 */
export const MoodPicker = ({ userId, watchlistKeys }: MoodPickerProps) => {
  const [selectedMoodId, setSelectedMoodId] = useState<MoodId | null>(null);
  const [loadedMoodId, setLoadedMoodId] = useState<MoodId | null>(null);
  const [movies, setMovies] = useState<MediaCardItem[]>([]);
  const [shows, setShows] = useState<MediaCardItem[]>([]);

  const isPending = selectedMoodId !== null && selectedMoodId !== loadedMoodId;

  // State is only ever set inside the async callback (an async boundary),
  // never synchronously in the effect body — react-hooks/set-state-in-effect
  // flags the latter, hit earlier elsewhere in this app for the same reason.
  useEffect(() => {
    if (!selectedMoodId) return;

    const mood = getMoodById(selectedMoodId);
    const controller = new AbortController();

    (async () => {
      try {
        const [movieResponse, tvResponse] = await Promise.all([
          fetch(`/api/tmdb/discover?genres=${mood.movieGenres}&type=movie`, {
            signal: controller.signal,
          }),
          fetch(`/api/tmdb/discover?genres=${mood.tvGenres}&type=tv`, {
            signal: controller.signal,
          }),
        ]);
        const [movieData, tvData]: [TmdbSearchResponse, TmdbSearchResponse] = await Promise.all([
          movieResponse.json(),
          tvResponse.json(),
        ]);

        setMovies(
          (movieData.results ?? [])
            .slice(0, RESULT_LIMIT)
            .map((result) => toMediaCardItem(result, "movie")),
        );
        setShows(
          (tvData.results ?? [])
            .slice(0, RESULT_LIMIT)
            .map((result) => toMediaCardItem(result, "tv")),
        );
        setLoadedMoodId(mood.id);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMovies([]);
          setShows([]);
          setLoadedMoodId(mood.id);
        }
      }
    })();

    return () => controller.abort();
  }, [selectedMoodId]);

  return (
    <HomeSection title="What are you in the mood for?">
      <div className="mt-4 flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            onClick={() => setSelectedMoodId(mood.id)}
            aria-pressed={selectedMoodId === mood.id}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
              selectedMoodId === mood.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground"
            }`}
          >
            {mood.emoji} {mood.label}
          </button>
        ))}
      </div>

      {isPending && <p className="mt-6 text-muted-foreground">Finding something good…</p>}

      {selectedMoodId && !isPending && (
        <div className="mt-6">
          <MoodResults movies={movies} shows={shows} userId={userId} watchlistKeys={watchlistKeys} />
        </div>
      )}
    </HomeSection>
  );
};
