import { z } from "zod";

export const seasonLogSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().min(0),
  rating: z.coerce.number().min(0.5).max(5).multipleOf(0.5),
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

export type SeasonLogInput = z.infer<typeof seasonLogSchema>;
