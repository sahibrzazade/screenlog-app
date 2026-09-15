import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PaginatedDiaryList } from "@/components/paginated-diary-list";
import type { DiaryEntry } from "@/lib/diary";

afterEach(cleanup);

const entry = (overrides: Partial<DiaryEntry>): DiaryEntry => ({
  id: overrides.id ?? "id",
  mediaType: "movie",
  title: overrides.title ?? "Title",
  posterPath: null,
  rating: null,
  review: null,
  watchedDate: "2020-01-01",
  createdAt: "2020-01-01T00:00:00Z",
  href: "/movie/1",
  ...overrides,
});

describe("PaginatedDiaryList", () => {
  it("shows the empty message when there are no entries", () => {
    render(
      <PaginatedDiaryList
        title="Movies"
        backHref="/user/example"
        entries={[]}
        emptyMessage="Nothing here."
      />,
    );

    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders no pagination controls for a single page of entries", () => {
    const entries = Array.from({ length: 5 }, (_, i) => entry({ id: `${i}`, title: `Title ${i}` }));

    render(
      <PaginatedDiaryList
        title="Movies"
        backHref="/user/example"
        entries={entries}
        emptyMessage="Nothing here."
      />,
    );

    expect(screen.getByText("Title 0")).toBeInTheDocument();
    expect(screen.getByText("Title 4")).toBeInTheDocument();
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
  });

  it("shows only the current page's entries and correct pagination links", () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry({ id: `${i}`, title: `Title ${i}` }));

    render(
      <PaginatedDiaryList
        title="Movies"
        backHref="/user/example"
        entries={entries}
        page="2"
        emptyMessage="Nothing here."
      />,
    );

    // Page size is 24, so page 2 shows entries 24-29 (6 items).
    expect(screen.getByText("Title 24")).toBeInTheDocument();
    expect(screen.getByText("Title 29")).toBeInTheDocument();
    expect(screen.queryByText("Title 0")).not.toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "?page=1");
  });

  it("clamps an out-of-range page to the last valid page", () => {
    const entries = Array.from({ length: 30 }, (_, i) => entry({ id: `${i}`, title: `Title ${i}` }));

    render(
      <PaginatedDiaryList
        title="Movies"
        backHref="/user/example"
        entries={entries}
        page="99"
        emptyMessage="Nothing here."
      />,
    );

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });
});
