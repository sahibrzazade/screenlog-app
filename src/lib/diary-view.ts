export type DiaryView = "grid" | "list";

/** Reads the raw `view` search param; anything but "list" falls back to the default grid. */
export const parseDiaryView = (raw?: string | string[]): DiaryView =>
  (Array.isArray(raw) ? raw[0] : raw) === "list" ? "list" : "grid";

/** Builds a diary list URL, leaving out params at their defaults (grid view, page 1). */
export const diaryHref = (
  basePath: string,
  { view, page }: { view: DiaryView; page?: number },
): string => {
  const params = new URLSearchParams();
  if (page && page > 1) params.set("page", String(page));
  if (view === "list") params.set("view", "list");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
};
