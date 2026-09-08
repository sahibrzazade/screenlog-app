"use client";

import { LogTitleForm } from "@/components/log-title-form";
import {
  clearShowLogField,
  deleteShowLog,
  logShow,
  setShowRating,
} from "@/app/tv/[id]/actions";

type LogShowFormProps = {
  tmdbShowId: number;
  title: string;
  posterUrl: string | null;
  initialLog: { rating: number | null; review: string | null; watchedDate: string } | null;
};

export const LogShowForm = ({
  tmdbShowId,
  title,
  posterUrl,
  initialLog,
}: LogShowFormProps) => (
  <LogTitleForm
    tmdbId={tmdbShowId}
    idField="tmdbShowId"
    formIdPrefix="log-show-form"
    mediaType="tv"
    title={title}
    posterUrl={posterUrl}
    watchedDateLabel="Date finished"
    submitLabel="Log show"
    initialLog={initialLog}
    actions={{
      log: logShow,
      deleteLog: deleteShowLog,
      setRating: setShowRating,
      clearField: clearShowLogField,
    }}
  />
);
