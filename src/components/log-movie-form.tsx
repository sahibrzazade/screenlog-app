"use client";

import { LogTitleForm } from "@/components/log-title-form";
import {
  clearMovieLogField,
  deleteMovieLog,
  logMovie,
  setMovieRating,
} from "@/app/movie/[id]/actions";

type LogMovieFormProps = {
  tmdbMovieId: number;
  title: string;
  posterUrl: string | null;
  initialLog: { rating: number | null; review: string | null; watchedDate: string } | null;
};

export const LogMovieForm = ({
  tmdbMovieId,
  title,
  posterUrl,
  initialLog,
}: LogMovieFormProps) => (
  <LogTitleForm
    tmdbId={tmdbMovieId}
    idField="tmdbMovieId"
    formIdPrefix="log-movie-form"
    mediaType="movie"
    title={title}
    posterUrl={posterUrl}
    watchedDateLabel="Watched date"
    submitLabel="Log movie"
    initialLog={initialLog}
    actions={{
      log: logMovie,
      deleteLog: deleteMovieLog,
      setRating: setMovieRating,
      clearField: clearMovieLogField,
    }}
  />
);
