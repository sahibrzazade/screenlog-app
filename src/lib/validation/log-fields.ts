import { z } from "zod";

/** Shared "optional written review" field: trimmed, capped, "" → undefined. */
export const reviewField = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value.length > 0 ? value : undefined));

/**
 * Shared "watched date" field: an ISO `YYYY-MM-DD` string, not in the future.
 * `label` only tweaks the future-date error message ("Watched date" for
 * movies/seasons, "Date finished" for shows).
 */
export const watchedDateField = (label = "Watched date") =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine(
      (date) => new Date(date) <= new Date(),
      `${label} can't be in the future`,
    );
