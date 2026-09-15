import { z } from "zod";

/** Up to 4 TMDB ids, in display order — used for both top_movie_ids and top_show_ids. */
export const showcaseIdsSchema = z
  .array(z.coerce.number().int().positive())
  .max(4, "You can only pick up to 4 titles");

/** A single "currently watching" TMDB show id, or null to clear it. */
export const nowWatchingIdSchema = z.coerce.number().int().positive().nullable();

export type ShowcaseIdsInput = z.infer<typeof showcaseIdsSchema>;
export type NowWatchingIdInput = z.infer<typeof nowWatchingIdSchema>;
