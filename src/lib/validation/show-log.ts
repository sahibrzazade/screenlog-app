import { z } from "zod";

export const showLogSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  rating: z.coerce.number().min(0.5).max(5).multipleOf(0.5),
  review: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : undefined)),
});

export type ShowLogInput = z.infer<typeof showLogSchema>;
