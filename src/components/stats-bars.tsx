"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { EntryTally } from "@/lib/stats";

export type StatsChartBar = EntryTally & {
  /** Axis label, e.g. "Mar". */
  label: string;
  /** Shorter axis label when space is tight (e.g. "'23" for 2023). */
  shortLabel?: string;
  /** Full name for the tooltip and screen readers, e.g. "March 2026". */
  title: string;
};

const countOf = (value: number, one: string, many: string) =>
  `${value.toLocaleString("en-US")} ${value === 1 ? one : many}`;

const entriesText = (bar: EntryTally) => countOf(bar.count, "entry", "entries");
const splitText = (bar: EntryTally) =>
  `${countOf(bar.films, "film", "films")} · ${bar.tv.toLocaleString("en-US")} TV`;

/** "March 2026: 7 entries, 4 films, 3 TV" — the bar's accessible name. */
export const barSummary = (bar: StatsChartBar) =>
  bar.count === 0
    ? `${bar.title}: 0 entries`
    : `${bar.title}: ${entriesText(bar)}, ${countOf(bar.films, "film", "films")}, ${bar.tv.toLocaleString("en-US")} TV`;

/**
 * The bars of a stats chart. One tab stop for the whole chart; arrow keys /
 * Home / End move between bars. Hover, focus or tap shows a tooltip with the
 * films / TV split, and every bar's accessible name carries the same text.
 */
export const StatsBars = ({
  bars,
  label,
}: {
  bars: StatsChartBar[];
  label: string;
}) => {
  const max = Math.max(0, ...bars.map((bar) => bar.count));
  const [active, setActive] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const last = bars.length - 1;

  const focusBar = (index: number) => {
    setTabStop(index);
    buttons.current[index]?.focus();
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const targets: Record<string, number> = {
      ArrowRight: Math.min(index + 1, last),
      ArrowLeft: Math.max(index - 1, 0),
      Home: 0,
      End: last,
    };
    const next = targets[event.key];
    if (next !== undefined) {
      event.preventDefault();
      focusBar(next);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="mt-3"
      onMouseLeave={() => setActive(null)}
      onBlur={onBlur}
    >
      {/* pt-5 leaves room for the count above the tallest bar. */}
      <div className="flex h-40 items-end gap-1 border-b border-border pt-5">
        {bars.map((bar, index) => {
          const height =
            bar.count > 0 ? Math.max((bar.count / max) * 100, 2) : 0;
          return (
            <button
              key={bar.label}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              tabIndex={index === tabStop ? 0 : -1}
              aria-label={barSummary(bar)}
              onMouseEnter={() => setActive(index)}
              onFocus={() => {
                setTabStop(index);
                setActive(index);
              }}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {bar.count > 0 && (
                // max-w keeps a lone bar (e.g. all time with one year) a column, not a solid block.
                <span
                  aria-hidden
                  className={`relative w-full max-w-10 rounded-t-sm transition-colors ${
                    active === index ? "bg-accent-hover" : "bg-accent"
                  }`}
                  style={{ height: `${height}%` }}
                >
                  <span className="absolute inset-x-0 bottom-full mb-0.5 text-center text-xs text-muted-foreground tabular-nums">
                    {bar.count.toLocaleString("en-US")}
                  </span>
                </span>
              )}
              {active === index && (
                // Anchor with the bar's own size and place, so the tooltip sits just above this bar's
                // top (and its count) — not at the edge of a wide column when there are few bars.
                // z-10 sits here, not only on the tooltip: the transform makes this span its own
                // stacking context, so a z-index inside it can't lift it above the next bars.
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-full max-w-10 -translate-x-1/2"
                  style={{ height: `${height}%` }}
                >
                  <Tooltip bar={bar} align={tooltipAlign(index, bars.length)} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-1 flex gap-1">
        {bars.map((bar) => (
          <span
            key={bar.label}
            className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {bar.shortLabel ?? bar.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const ALIGN = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const;

/**
 * Centered over the bar, except the two outermost bars on each side of a
 * chart with many (narrow) bars, where a centered tooltip would leave the
 * screen. With few bars each column is wide enough to center.
 */
const tooltipAlign = (index: number, count: number): keyof typeof ALIGN => {
  if (count <= 3) return "center";
  if (index < 2) return "start";
  return index > count - 3 ? "end" : "center";
};

/** Visual only — the bar's aria-label already says the same thing. */
const Tooltip = ({
  bar,
  align,
}: {
  bar: StatsChartBar;
  align: keyof typeof ALIGN;
}) => (
  <span
    aria-hidden
    className={`absolute bottom-full z-10 mb-5 w-max rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-left text-xs shadow-lg ${ALIGN[align]}`}
  >
    <span className="block font-semibold text-foreground">{bar.title}</span>
    <span className="block text-muted-foreground">{entriesText(bar)}</span>
    {bar.count > 0 && (
      <span className="block text-muted-foreground">{splitText(bar)}</span>
    )}
  </span>
);
