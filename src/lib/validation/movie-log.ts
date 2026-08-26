import { z } from "zod";

export const movieLogSchema = z.object({
  tmdbMovieId: z.coerce.number().int().positive(),
  review: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : undefined)),
  watchedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((date) => new Date(date) <= new Date(), "Watched date can't be in the future"),
});

export type MovieLogInput = z.infer<typeof movieLogSchema>;
