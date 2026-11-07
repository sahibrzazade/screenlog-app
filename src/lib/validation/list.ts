import { z } from "zod";

export const LIST_TITLE_MAX = 100;
export const LIST_DESCRIPTION_MAX = 1000;
/** Also enforced by a trigger (0019). */
export const LIST_ITEM_MAX = 100;

const titleRequired = "Give your list a title.";

/** Title and description, as a list's form submits them. Blank description → null. */
export const listFieldsSchema = z.object({
  title: z
    .string(titleRequired)
    .trim()
    .min(1, titleRequired)
    .max(LIST_TITLE_MAX, `Title can be at most ${LIST_TITLE_MAX} characters.`),
  description: z
    .string()
    .trim()
    .max(LIST_DESCRIPTION_MAX, `Description can be at most ${LIST_DESCRIPTION_MAX} characters.`)
    .nullish()
    .transform((value) => value || null),
});

export const listUpdateSchema = listFieldsSchema.extend({ listId: z.uuid() });

export const listIdSchema = z.uuid();

export const listItemIdSchema = z.uuid();

/** A movie or show on a list. */
export const listItemTitleSchema = z.object({
  listId: z.uuid(),
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
});

export const listItemRestoreSchema = listItemTitleSchema.extend({
  position: z.number().int().nonnegative(),
});

/** A list's item ids in their new order. */
export const listItemOrderSchema = z.object({
  listId: z.uuid(),
  itemIds: z
    .array(z.uuid())
    .min(1)
    .max(LIST_ITEM_MAX)
    .refine((ids) => new Set(ids).size === ids.length),
});
