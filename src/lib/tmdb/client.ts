const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/**
 * Server-only TMDB fetch wrapper. Never import this from a "use client"
 * component — TMDB_API_KEY must not reach the browser bundle.
 */
export const tmdbFetch = async <T>(
  path: string,
  searchParams?: Record<string, string>,
): Promise<T> => {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(searchParams ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      accept: "application/json",
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};
