import { z } from "zod";
import { reviewField, watchedDateField } from "@/lib/validation/log-fields";

export const seasonLogSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  seasonNumber: z.coerce.number().int().min(0),
  review: reviewField,
  watchedDate: watchedDateField(),
});

export type SeasonLogInput = z.infer<typeof seasonLogSchema>;
