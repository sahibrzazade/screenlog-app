"use client";

import { LogTitleForm } from "@/components/log-title-form";
import {
  clearSeasonLogField,
  deleteSeasonLog,
  logSeason,
  setSeasonRating,
} from "@/app/tv/[id]/actions";

type LogSeasonFormProps = {
  tmdbShowId: number;
  seasonNumber: number;
  seasonName: string;
  posterUrl: string | null;
  initialLog: { rating: number | null; review: string | null; watchedDate: string } | null;
};

export const LogSeasonForm = ({
  tmdbShowId,
  seasonNumber,
  seasonName,
  posterUrl,
  initialLog,
}: LogSeasonFormProps) => (
  <LogTitleForm
    tmdbId={tmdbShowId}
    idField="tmdbShowId"
    extraFields={{ seasonNumber }}
    formIdPrefix="log-season-form"
    mediaType="season"
    seasonNumber={seasonNumber}
    title={seasonName}
    posterUrl={posterUrl}
    watchedDateLabel="Date finished"
    submitLabel="Log season"
    initialLog={initialLog}
    actions={{
      log: logSeason,
      deleteLog: deleteSeasonLog,
      setRating: setSeasonRating,
      clearField: clearSeasonLogField,
    }}
  />
);
