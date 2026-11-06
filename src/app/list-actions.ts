"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { ZodError } from "zod";
import { getUserContext } from "@/lib/supabase/auth";
import {
  listFieldsSchema,
  listIdSchema,
  listItemIdSchema,
  listItemRestoreSchema,
  listUpdateSchema,
} from "@/lib/validation/list";

/**
 * `listId` is the list acted on, set on success. `field` names the form field
 * an error belongs to, so the form can show it there.
 */
export type ListActionState = { error?: string; field?: "title" | "description"; listId?: string };

const NOT_FOUND = "This list no longer exists.";
const LOGGED_OUT = "You must be logged in to manage lists.";
const UNIQUE_VIOLATION = "23505";

const invalidInput = (error: ZodError): ListActionState => {
  const [issue] = error.issues;
  const field = issue.path[0];
  return {
    error: issue.message,
    ...(field === "title" || field === "description" ? { field } : {}),
  };
};

const revalidateListPages = () => {
  revalidatePath("/user/[username]", "page");
  revalidatePath("/user/[username]/lists", "page");
  revalidatePath("/user/[username]/lists/[listId]", "page");
};

export const createList = async (
  _prevState: ListActionState,
  formData: FormData,
): Promise<ListActionState> => {
  const parsed = listFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: user.id, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Failed to create the list. Please try again." };
  }

  revalidateListPages();
  return { listId: data.id };
};

export const updateList = async (
  _prevState: ListActionState,
  formData: FormData,
): Promise<ListActionState> => {
  const parsed = listUpdateSchema.safeParse({
    listId: formData.get("listId"),
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { listId, title, description } = parsed.data;

  // RLS already limits this to the owner; the user_id filter makes someone
  // else's list read as "not found" instead of a silent no-op.
  const { data, error } = await supabase
    .from("lists")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Failed to save the list. Please try again." };
  }
  if (!data) {
    return { error: NOT_FOUND };
  }

  revalidateListPages();
  return { listId };
};

export const deleteList = async (
  _prevState: ListActionState,
  formData: FormData,
): Promise<ListActionState> => {
  const parsed = listIdSchema.safeParse(formData.get("listId"));

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { data, error } = await supabase
    .from("lists")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Failed to delete the list. Please try again." };
  }
  if (!data) {
    return { error: NOT_FOUND };
  }

  const { data: profile } = await supabase
    .from("profiles_public")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  revalidateListPages();
  // Redirecting here, not from the client: the deleted list's page would
  // otherwise re-render as a 404 before the client could navigate away.
  // Replace, so Back doesn't return to the deleted list; a redirect returns
  // nothing to the client, so the lists page shows the toast from the param.
  redirect(profile?.username ? `/user/${profile.username}/lists?deleted=1` : "/", RedirectType.replace);
};

export const removeListItem = async (listId: string, itemId: string): Promise<ListActionState> => {
  if (!listIdSchema.safeParse(listId).success || !listItemIdSchema.safeParse(itemId).success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  // RLS limits item writes to the list's owner, so someone else's item matches no row.
  const { data, error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", itemId)
    .eq("list_id", listId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Failed to remove the title. Please try again." };
  }
  if (!data) {
    return { error: "This title is no longer on the list." };
  }

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("user_id", user.id);

  revalidateListPages();
  return { listId };
};

/**
 * Undo for `removeListItem`: puts the title back at its old position, so a
 * ranked list keeps its order. RLS limits this to the list's owner.
 */
export const restoreListItem = async (
  listId: string,
  item: { tmdbId: number; mediaType: "movie" | "tv"; position: number },
): Promise<ListActionState> => {
  const parsed = listItemRestoreSchema.safeParse({ listId, ...item });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { error } = await supabase.from("list_items").insert({
    list_id: parsed.data.listId,
    tmdb_id: parsed.data.tmdbId,
    media_type: parsed.data.mediaType,
    position: parsed.data.position,
  });

  // Already back (e.g. a double click): the desired end state holds.
  if (error && error.code !== UNIQUE_VIOLATION) {
    return { error: "Couldn't put the title back. Please try again." };
  }

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("user_id", user.id);

  revalidateListPages();
  return { listId };
};
