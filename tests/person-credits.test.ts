import { describe, it, expect } from "vitest";
import { shapePersonCredits } from "@/lib/tmdb/person-credits";
import type { TmdbPersonCastCredit } from "@/lib/tmdb/types";

const movie = (id: number, overrides: Partial<TmdbPersonCastCredit> = {}): TmdbPersonCastCredit => ({
  id,
  media_type: "movie",
  title: `Movie ${id}`,
  release_date: "2000-01-01",
  poster_path: `/m${id}.jpg`,
  character: `Role ${id}`,
  vote_count: id,
  genre_ids: [18],
  ...overrides,
});

const show = (id: number, overrides: Partial<TmdbPersonCastCredit> = {}): TmdbPersonCastCredit => ({
  id,
  media_type: "tv",
  name: `Show ${id}`,
  first_air_date: "2010-01-01",
  poster_path: `/s${id}.jpg`,
  character: `Role ${id}`,
  vote_count: id,
  genre_ids: [18],
  ...overrides,
});

describe("shapePersonCredits", () => {
  it("maps movies and shows to cards with title, year, poster and character", () => {
    const { filmography } = shapePersonCredits([
      movie(1, { release_date: "1999-03-31" }),
      show(2, { first_air_date: "2008-01-20" }),
    ]);

    expect(filmography).toEqual([
      { id: 2, mediaType: "tv", title: "Show 2", year: "2008", posterPath: "/s2.jpg", character: "Role 2" },
      { id: 1, mediaType: "movie", title: "Movie 1", year: "1999", posterPath: "/m1.jpg", character: "Role 1" },
    ]);
  });

  it("drops talk show and news appearances", () => {
    const { filmography } = shapePersonCredits([
      show(1, { genre_ids: [10767] }),
      show(2, { genre_ids: [35, 10763] }),
      show(3),
    ]);

    expect(filmography.map((item) => item.id)).toEqual([3]);
  });

  it("merges a title credited more than once, joining distinct characters", () => {
    const { filmography } = shapePersonCredits([
      show(5, { character: "Walter White" }),
      show(5, { character: "Heisenberg" }),
      show(5, { character: "Walter White" }),
      movie(5, { character: "Someone" }),
    ]);

    expect(filmography).toHaveLength(2);
    expect(filmography.find((item) => item.mediaType === "tv")?.character).toBe("Walter White / Heisenberg");
  });

  it("treats missing characters as empty and skips them when merging", () => {
    const { filmography } = shapePersonCredits([show(1, { character: null }), show(1, { character: "Self" })]);

    expect(filmography[0].character).toBe("Self");
    expect(shapePersonCredits([movie(2, { character: null })]).filmography[0].character).toBe("");
  });

  it("sorts newest first by full date and puts undated credits last", () => {
    const { filmography } = shapePersonCredits([
      movie(1, { release_date: "2001-05-01" }),
      movie(2, { release_date: "" }),
      show(3, { first_air_date: "2001-06-01" }),
      movie(4, { release_date: undefined }),
      movie(5, { release_date: "2020-01-01" }),
    ]);

    expect(filmography.map((item) => item.id)).toEqual([5, 3, 1, 2, 4]);
    expect(filmography[3].year).toBeNull();
  });

  it("picks the 8 most-voted credits for Known for", () => {
    const credits = Array.from({ length: 10 }, (_, index) => movie(index + 1, { vote_count: (index + 1) * 10 }));

    const { knownFor } = shapePersonCredits(credits);

    expect(knownFor.map((item) => item.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
  });

  it("leaves Known for empty when there are 8 or fewer credits after filtering and merging", () => {
    const credits = [
      ...Array.from({ length: 8 }, (_, index) => movie(index + 1)),
      movie(1, { character: "Again" }),
      show(99, { genre_ids: [10767] }),
    ];

    expect(shapePersonCredits(credits).knownFor).toEqual([]);
  });

  it("returns empty lists for no credits", () => {
    expect(shapePersonCredits([])).toEqual({ knownFor: [], filmography: [] });
  });
});
