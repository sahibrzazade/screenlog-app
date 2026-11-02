import { z } from "zod";
import { reviewField, watchedDateField } from "@/lib/validation/log-fields";

/** A show log's status (migration 0017): finished, or given up on. */
export const showStatusSchema = z.enum(["completed", "dropped"]);

export type ShowStatus = z.infer<typeof showStatusSchema>;

export const showLogSchema = z.object({
  tmdbShowId: z.coerce.number().int().positive(),
  review: reviewField,
  // "Date finished" or "Date dropped" depending on status — keep the message neutral.
  watchedDate: watchedDateField("Date"),
  status: showStatusSchema.default("completed"),
});

export type ShowLogInput = z.infer<typeof showLogSchema>;
