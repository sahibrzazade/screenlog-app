import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DiaryEntry } from "@/components/diary-entry";
import { DiaryGrid } from "@/components/diary-grid";
import { DiaryViewToggle } from "@/components/diary-view-toggle";
import type { DiaryEntry as DiaryEntryData } from "@/lib/diary";
import { diaryHref, parseDiaryView } from "@/lib/diary-view";

// Divides evenly into the grid's 3 (mobile) and 4 (sm+) columns.
const PAGE_SIZE = 24;

type PaginatedDiaryListProps = {
  title: string;
  backHref: string;
  /** This list's own path, used to build pagination and view-toggle links. */
  basePath: string;
  entries: DiaryEntryData[];
  /** Raw `page` search param value, as handed in by Next's `searchParams`. */
  page?: string | string[];
  /** Raw `view` search param value; grid unless it's "list". */
  view?: string | string[];
  emptyMessage: string;
};

/** A simple, server-rendered page-number paginated list — no client JS needed. */
export const PaginatedDiaryList = ({
  title,
  backHref,
  basePath,
  entries,
  page,
  view: rawView,
  emptyMessage,
}: PaginatedDiaryListProps) => {
  const view = parseDiaryView(rawView);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const requestedPage = Number(Array.isArray(page) ? page[0] : page);
  const currentPage = Number.isInteger(requestedPage)
    ? Math.min(Math.max(1, requestedPage), totalPages)
    : 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={backHref} className="text-sm text-accent hover:text-accent-hover">
        ← Back to profile
      </Link>
      <div className="mt-2 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {entries.length > 0 && (
          <DiaryViewToggle basePath={basePath} view={view} page={currentPage} />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          {view === "grid" ? (
            <div className="mt-4">
              <DiaryGrid entries={pageEntries} />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-1">
              {pageEntries.map((entry) => (
                <DiaryEntry key={entry.id} entry={entry} />
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              {currentPage > 1 ? (
                <Link
                  href={diaryHref(basePath, { view, page: currentPage - 1 })}
                  className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
                >
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-sm text-subtle-foreground">
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  href={diaryHref(basePath, { view, page: currentPage + 1 })}
                  className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
                >
                  Next <ChevronRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-sm text-subtle-foreground">
                  Next <ChevronRight className="size-4" aria-hidden />
                </span>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
};
