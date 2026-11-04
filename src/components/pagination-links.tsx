import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationLinksProps = {
  currentPage: number;
  totalPages: number;
  /** Link for a page number, keeping the list's other params. */
  hrefFor: (page: number) => string;
};

/** Previous / "Page N of M" / Next for server-rendered lists; nothing when there's one page. */
export const PaginationLinks = ({ currentPage, totalPages, hrefFor }: PaginationLinksProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between">
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
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
          href={hrefFor(currentPage + 1)}
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
  );
};
