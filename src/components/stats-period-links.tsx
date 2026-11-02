import Link from "next/link";
import { statsHref, type StatsPeriod } from "@/lib/stats";

type StatsPeriodLinksProps = {
  basePath: string;
  /** Years to offer, newest first (always includes the current year). */
  years: number[];
  period: StatsPeriod;
  currentYear: number;
};

/** Year / "All time" segmented links; styled like the watchlist filter. Wraps on narrow screens. */
export const StatsPeriodLinks = ({ basePath, years, period, currentYear }: StatsPeriodLinksProps) => (
  <nav
    aria-label="Stats period"
    className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border p-0.5"
  >
    {[...years, "all" as const].map((option) => {
      const active = option === period;

      return (
        <Link
          key={option}
          href={statsHref(basePath, option, currentYear)}
          aria-current={active ? "page" : undefined}
          className={`rounded px-3 py-2 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option === "all" ? "All time" : option}
        </Link>
      );
    })}
  </nav>
);
