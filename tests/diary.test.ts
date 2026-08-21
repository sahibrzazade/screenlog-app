import { describe, expect, it } from "vitest";
import { sortDiaryEntries, type DiaryEntry } from "@/lib/diary";

const entry = (overrides: Partial<DiaryEntry>): DiaryEntry => ({
  id: "id",
  mediaType: "movie",
  title: "Title",
  posterPath: null,
  rating: 4,
  review: null,
  watchedDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00Z",
  href: "/movie/1",
  ...overrides,
});

describe("sortDiaryEntries", () => {
  it("sorts entries by watchedDate descending", () => {
    const entries = [
      entry({ id: "a", watchedDate: "2020-01-01" }),
      entry({ id: "b", watchedDate: "2022-06-15" }),
      entry({ id: "c", watchedDate: "2021-03-10" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("merges movie and season entries into one chronological list", () => {
    const entries = [
      entry({ id: "movie", mediaType: "movie", watchedDate: "2020-05-01" }),
      entry({ id: "season", mediaType: "season", watchedDate: "2020-06-01" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["season", "movie"]);
  });

  it("merges season and show entries into one chronological list", () => {
    const entries = [
      entry({ id: "season", mediaType: "season", watchedDate: "2020-05-01" }),
      entry({ id: "show", mediaType: "show", watchedDate: "2020-06-01" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["show", "season"]);
  });

  it("breaks watchedDate ties with createdAt descending", () => {
    const entries = [
      entry({ id: "earlier", watchedDate: "2020-01-01", createdAt: "2020-01-01T10:00:00Z" }),
      entry({ id: "later", watchedDate: "2020-01-01", createdAt: "2020-01-01T12:00:00Z" }),
    ];

    expect(sortDiaryEntries(entries).map((e) => e.id)).toEqual(["later", "earlier"]);
  });

  it("does not mutate the input array", () => {
    const entries = [
      entry({ id: "a", watchedDate: "2020-01-01" }),
      entry({ id: "b", watchedDate: "2022-06-15" }),
    ];
    const original = [...entries];

    sortDiaryEntries(entries);

    expect(entries).toEqual(original);
  });
});
