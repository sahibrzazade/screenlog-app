import type { MediaCardItem } from "@/components/media-card";
import type { TmdbPersonCastCredit } from "@/lib/tmdb/types";

export type PersonCreditItem = MediaCardItem & { character: string };

/** TMDB TV genres whose credits are guest appearances, not roles. */
const EXCLUDED_TV_GENRES = new Set([10767 /* Talk */, 10763 /* News */]);
const KNOWN_FOR_COUNT = 8;

type MergedCredit = {
  item: PersonCreditItem;
  characters: string[];
  date: string;
  voteCount: number;
};

/**
 * Turns a person's acting credits into the person page's two lists: the full
 * filmography (newest first, undated last) and the 8 most-voted "Known for"
 * credits, left empty when the filmography already fits in 8.
 */
export const shapePersonCredits = (
  cast: TmdbPersonCastCredit[],
): { knownFor: PersonCreditItem[]; filmography: PersonCreditItem[] } => {
  const merged = new Map<string, MergedCredit>();

  for (const credit of cast) {
    if (credit.media_type === "tv" && credit.genre_ids.some((genre) => EXCLUDED_TV_GENRES.has(genre))) {
      continue;
    }

    const key = `${credit.media_type}-${credit.id}`;
    const character = credit.character?.trim() ?? "";
    const existing = merged.get(key);

    if (existing) {
      if (character && !existing.characters.includes(character)) existing.characters.push(character);
      continue;
    }

    const isMovie = credit.media_type === "movie";
    const date = (isMovie ? credit.release_date : credit.first_air_date) ?? "";

    merged.set(key, {
      item: {
        id: credit.id,
        mediaType: credit.media_type,
        title: (isMovie ? credit.title : credit.name) ?? "Untitled",
        year: date.slice(0, 4) || null,
        posterPath: credit.poster_path,
        character: "",
      },
      characters: character ? [character] : [],
      date,
      voteCount: credit.vote_count,
    });
  }

  const credits = [...merged.values()].map((credit) => ({
    ...credit,
    item: { ...credit.item, character: credit.characters.join(" / ") },
  }));

  const filmography = credits
    .toSorted((a, b) => {
      if (!a.date || !b.date) return Number(!a.date) - Number(!b.date);
      return b.date.localeCompare(a.date);
    })
    .map((credit) => credit.item);

  const knownFor =
    credits.length > KNOWN_FOR_COUNT
      ? credits
          .toSorted((a, b) => b.voteCount - a.voteCount)
          .slice(0, KNOWN_FOR_COUNT)
          .map((credit) => credit.item)
      : [];

  return { knownFor, filmography };
};
