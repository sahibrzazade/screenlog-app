const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

type PosterSize = "w154" | "w185" | "w500";
type ProfileSize = "w185";
type BackdropSize = "w780" | "w1280";
type StillSize = "w300";

const buildUrl = (
  path: string | null | undefined,
  size: string,
): string | null => (path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null);

/** TMDB poster image URL, or null when there's no poster. */
export const posterUrl = (
  path: string | null | undefined,
  size: PosterSize = "w500",
): string | null => buildUrl(path, size);

/** TMDB cast/crew profile image URL, or null when there's no photo. */
export const profileUrl = (
  path: string | null | undefined,
  size: ProfileSize = "w185",
): string | null => buildUrl(path, size);

/** TMDB backdrop image URL, or null when there's no backdrop. */
export const backdropUrl = (
  path: string | null | undefined,
  size: BackdropSize = "w1280",
): string | null => buildUrl(path, size);

/** TMDB episode still image URL, or null when there's no still. */
export const stillUrl = (
  path: string | null | undefined,
  size: StillSize = "w300",
): string | null => buildUrl(path, size);
