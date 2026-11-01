import Link from "next/link";
import { watchlistHref, type WatchlistFilter } from "@/lib/watchlist-filter";

const OPTIONS = [
  { filter: "all", label: "All" },
  { filter: "movie", label: "Movies" },
  { filter: "tv", label: "Shows" },
] as const;

type WatchlistFilterLinksProps = {
  basePath: string;
  filter: WatchlistFilter;
};

/** All / Movies / Shows segmented links; styled like `DiaryViewToggle`. */
export const WatchlistFilterLinks = ({ basePath, filter }: WatchlistFilterLinksProps) => (
  <nav aria-label="Filter watchlist" className="flex shrink-0 gap-1 rounded-md border border-border p-0.5">
    {OPTIONS.map(({ filter: option, label }) => {
      const active = option === filter;

      return (
        <Link
          key={option}
          href={watchlistHref(basePath, option)}
          aria-current={active ? "page" : undefined}
          className={`rounded px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      );
    })}
  </nav>
);
