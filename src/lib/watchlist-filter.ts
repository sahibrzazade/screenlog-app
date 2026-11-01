export type WatchlistFilter = "all" | "movie" | "tv";

/** Reads the raw `type` search param; anything but "movie" or "tv" falls back to all. */
export const parseWatchlistFilter = (raw?: string | string[]): WatchlistFilter => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "movie" || value === "tv" ? value : "all";
};

/** Builds a watchlist URL, leaving out the param for the default "all" filter. */
export const watchlistHref = (basePath: string, filter: WatchlistFilter): string =>
  filter === "all" ? basePath : `${basePath}?type=${filter}`;

/** Keeps only the items of the selected media type; "all" returns the list as-is. */
export const filterWatchlistItems = <T extends { mediaType: "movie" | "tv" }>(
  items: T[],
  filter: WatchlistFilter,
): T[] => (filter === "all" ? items : items.filter((item) => item.mediaType === filter));
