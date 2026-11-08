// Watched dates are calendar dates ("2026-11-07"). Parsing and formatting in
// UTC keeps the shown day the stored one, whatever the viewer's timezone.
const atUtcMidnight = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

/** "November 2026" */
export const formatMonthHeading = (isoDate: string) =>
  atUtcMidnight(isoDate).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** "07" */
export const formatDayOfMonth = (isoDate: string) => isoDate.slice(8, 10);

/** "Fri" */
export const formatWeekday = (isoDate: string) =>
  atUtcMidnight(isoDate).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

/** "7 Nov 2026" */
export const formatWatchDate = (isoDate: string) =>
  atUtcMidnight(isoDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export type MonthGroup<Entry> = { key: string; label: string; entries: Entry[] };

/**
 * Splits entries, already sorted newest first, into runs by month of
 * `watchedDate`. A month split across two loaded pages stays one group.
 */
export const groupByMonth = <Entry extends { watchedDate: string }>(entries: Entry[]): MonthGroup<Entry>[] =>
  entries.reduce<MonthGroup<Entry>[]>((groups, entry) => {
    const key = entry.watchedDate.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, label: formatMonthHeading(entry.watchedDate), entries: [entry] });
    }
    return groups;
  }, []);
