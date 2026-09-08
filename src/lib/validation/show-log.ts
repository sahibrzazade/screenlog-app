import { z } from "zod";
import { reviewField, watchedDateField } from "@/lib/validation/log-fields";

export const showLogSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  review: reviewField,
  watchedDate: watchedDateField("Date finished"),
});

export type ShowLogInput = z.infer<typeof showLogSchema>;
