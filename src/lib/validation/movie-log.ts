import { z } from "zod";
import { reviewField, watchedDateField } from "@/lib/validation/log-fields";

export const movieLogSchema = z.object({
  tmdbMovieId: z.coerce.number().int().positive(),
  review: reviewField,
  watchedDate: watchedDateField(),
});

export type MovieLogInput = z.infer<typeof movieLogSchema>;
