import { z } from "zod";

export const LIST_TITLE_MAX = 100;
export const LIST_DESCRIPTION_MAX = 1000;

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
    .nullable()
    .transform((value) => value || null),
});

export const listUpdateSchema = listFieldsSchema.extend({ listId: z.uuid() });

export const listIdSchema = z.uuid();
