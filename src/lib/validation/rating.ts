import { z } from "zod";

export const ratingSchema = z.coerce.number().min(0.5).max(5).multipleOf(0.5);
