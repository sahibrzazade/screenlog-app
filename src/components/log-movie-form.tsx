"use client";

import { LogTitleForm } from "@/components/log-title-form";
import {
  clearMovieLogField,
  deleteMovieLog,
  logMovie,
  setMovieRating,
} from "@/app/movie/[id]/actions";
import type { OwnWatch } from "@/lib/logs/queries";

type LogMovieFormProps = {
  tmdbMovieId: number;
  title: string;
  posterUrl: string | null;
  /** Every watch of the movie, latest first; the card shows the first. */
  watches: OwnWatch[];
};

export const LogMovieForm = ({
  tmdbMovieId,
  title,
  posterUrl,
  watches,
}: LogMovieFormProps) => (
  <LogTitleForm
    tmdbId={tmdbMovieId}
    idField="tmdbMovieId"
    formIdPrefix="log-movie-form"
    mediaType="movie"
    title={title}
    posterUrl={posterUrl}
    watchedDateLabel="Watched date"
    submitLabel="Save"
    initialLog={watches[0] ?? null}
    watches={watches}
    actions={{
      log: logMovie,
      deleteLog: deleteMovieLog,
      setRating: setMovieRating,
      clearField: clearMovieLogField,
    }}
  />
);
