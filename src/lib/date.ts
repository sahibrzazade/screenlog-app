/** Today's date as an ISO `YYYY-MM-DD` string (local time). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short relative time for activity items: "just now", "5m ago", "3h ago",
 * "2d ago", then a plain date ("12 Oct") after a week ("12 Oct 2025" if
 * it's from another year).
 */
export const formatRelativeTime = (timestamp: string, now: Date = new Date()) => {
  const date = new Date(timestamp);
  const elapsed = now.getTime() - date.getTime();

  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
};
