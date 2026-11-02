import { formatWatchTime, type StatsTotals as Totals } from "@/lib/stats";

const formatCount = (value: number) => value.toLocaleString("en-US");

/**
 * Films / Shows / Hours strip — same look as the profile stats strip — with
 * the watch time split into films and shows underneath ("Shows  12 days,
 * 2 hours and 37 minutes"). A type with no watch time is left out.
 */
export const StatsTotals = ({ films, shows, hours, movieMinutes, showMinutes }: Totals) => {
  const breakdown = [
    { label: "Films", minutes: movieMinutes },
    { label: "Shows", minutes: showMinutes },
  ].filter((row) => row.minutes > 0);

  return (
    <div>
      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border py-3">
        <Total value={films} label={films === 1 ? "Film" : "Films"} />
        <Total value={shows} label={shows === 1 ? "Show" : "Shows"} />
        <Total value={hours} label={hours === 1 ? "Hour" : "Hours"} />
      </dl>
      {breakdown.length > 0 && (
        <div role="group" aria-label="Watch time">
          <dl className="mx-auto mt-3 grid w-fit grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {breakdown.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-xs leading-5 tracking-widest text-muted-foreground uppercase">{row.label}</dt>
                <dd className="text-foreground">{formatWatchTime(row.minutes)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

const Total = ({ value, label }: { value: number; label: string }) => (
  // dd before dt visually (number over label) while keeping the term/description pairing for screen readers.
  <div className="flex flex-col-reverse items-center px-1 py-1 text-center">
    <dt className="mt-0.5 text-xs tracking-widest text-muted-foreground uppercase">{label}</dt>
    <dd className="text-2xl font-semibold text-foreground tabular-nums">{formatCount(value)}</dd>
  </div>
);
