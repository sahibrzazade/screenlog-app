import { z } from "zod";

export const watchlistToggleSchema = z.object({
  tmdbId: z.coerce.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  inWatchlist: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type WatchlistToggleInput = z.infer<typeof watchlistToggleSchema>;
