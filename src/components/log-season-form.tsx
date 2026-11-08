"use client";

import { LogTitleForm } from "@/components/log-title-form";
import {
  clearSeasonLogField,
  deleteSeasonLog,
  logSeason,
  setSeasonRating,
} from "@/app/tv/[id]/actions";
import type { OwnWatch } from "@/lib/logs/queries";

type LogSeasonFormProps = {
  tmdbShowId: number;
  seasonNumber: number;
  seasonName: string;
  posterUrl: string | null;
  /** Every watch of the season, latest first; the card shows the first. */
  watches: OwnWatch[];
};

export const LogSeasonForm = ({
  tmdbShowId,
  seasonNumber,
  seasonName,
  posterUrl,
  watches,
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
    submitLabel="Save"
    initialLog={watches[0] ?? null}
    watches={watches}
    actions={{
      log: logSeason,
      deleteLog: deleteSeasonLog,
      setRating: setSeasonRating,
      clearField: clearSeasonLogField,
    }}
  />
);
