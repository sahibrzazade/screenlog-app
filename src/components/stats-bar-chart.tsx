import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { StatsBars, type StatsChartBar } from "@/components/stats-bars";

type StatsBarChartProps = {
  title: string;
  /** Decorative icon before the title. */
  icon: LucideIcon;
  bars: StatsChartBar[];
  /** Accessible name of the bar group, e.g. "Entries per month in 2026". */
  caption: string;
  /** Shown instead of the bars when every bar is zero. */
  emptyMessage?: string;
};

/**
 * Plain HTML/CSS column chart (no chart library). Counts are printed above
 * the bars so nothing needs hovering; hover / focus / tap adds the films / TV
 * split (see StatsBars).
 */
export const StatsBarChart = ({ title, icon: Icon, bars, caption, emptyMessage }: StatsBarChartProps) => {
  const headingId = useId();
  const empty = bars.every((bar) => bar.count === 0);

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 shrink-0 text-accent" aria-hidden />
        {title}
      </h2>

      {empty && emptyMessage ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <StatsBars bars={bars} label={caption} />
      )}
    </section>
  );
};
