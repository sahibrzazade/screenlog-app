"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import { getUserContext } from "@/lib/supabase/auth";
import {
  LIST_ITEM_MAX,
  listFieldsSchema,
  listIdSchema,
  listItemIdSchema,
  listItemOrderSchema,
  listItemRestoreSchema,
  listItemTitleSchema,
  listUpdateSchema,
} from "@/lib/validation/list";

/**
 * `listId` is the list acted on, set on success. `field` names the form field
 * an error belongs to, so the form can show it there.
 */
export type ListActionState = { error?: string; field?: "title" | "description"; listId?: string };

const NOT_FOUND = "This list no longer exists.";
const LOGGED_OUT = "You must be logged in to manage lists.";
const LIST_FULL = `This list is full (${LIST_ITEM_MAX} titles).`;
const REORDER_FAILED = "Couldn't save the new order. Please try again.";
const UNIQUE_VIOLATION = "23505";
const RAISED_EXCEPTION = "P0001";

/** Item changes count as activity, so the list moves up on the lists page. */
const touchList = async (supabase: SupabaseClient, listId: string, userId: string) => {
  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("user_id", userId);
};

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

  await touchList(supabase, listId, user.id);

  revalidateListPages();
  return { listId };
};

/** Adds a title to the end of the user's list (add-to-list modal). */
export const addListItem = async (
  listId: string,
  title: { tmdbId: number; mediaType: "movie" | "tv" },
): Promise<ListActionState> => {
  const parsed = listItemTitleSchema.safeParse({ listId, ...title });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return { error: NOT_FOUND };
  }

  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  if ((count ?? 0) >= LIST_ITEM_MAX) {
    return { error: LIST_FULL };
  }

  const { data: last } = await supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("list_items").insert({
    list_id: listId,
    tmdb_id: parsed.data.tmdbId,
    media_type: parsed.data.mediaType,
    position: (last?.position ?? -1) + 1,
  });

  if (error?.code === RAISED_EXCEPTION) {
    // The 0019 trigger: another request filled the list after the check above.
    return { error: LIST_FULL };
  }
  // Already on the list (e.g. another tab): the desired end state holds.
  if (error && error.code !== UNIQUE_VIOLATION) {
    return { error: "Failed to add the title. Please try again." };
  }

  await touchList(supabase, listId, user.id);

  revalidateListPages();
  return { listId };
};

/** Removes a title from a list by its TMDB id (add-to-list modal). RLS limits this to the owner. */
export const removeTitleFromList = async (
  listId: string,
  title: { tmdbId: number; mediaType: "movie" | "tv" },
): Promise<ListActionState> => {
  const parsed = listItemTitleSchema.safeParse({ listId, ...title });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("tmdb_id", parsed.data.tmdbId)
    .eq("media_type", parsed.data.mediaType);

  if (error) {
    return { error: "Failed to remove the title. Please try again." };
  }

  await touchList(supabase, listId, user.id);

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

  await touchList(supabase, listId, user.id);

  revalidateListPages();
  return { listId };
};

/**
 * Applies a new order to the rows it names; every other row keeps its place.
 * The page can't show titles TMDB can't resolve or ones added since it loaded,
 * and ids of titles removed since are dropped.
 */
const mergeItemOrder = (currentIds: string[], reorderedIds: string[]) => {
  const existing = new Set(currentIds);
  const moved = reorderedIds.filter((id) => existing.has(id));
  const movedSet = new Set(moved);
  let next = 0;
  return currentIds.map((id) => (movedSet.has(id) ? moved[next++] : id));
};

/** Saves the order the owner dragged a list's titles into. */
export const reorderListItems = async (listId: string, itemIds: string[]): Promise<ListActionState> => {
  const parsed = listItemOrderSchema.safeParse({ listId, itemIds });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const { supabase, user } = await getUserContext();

  if (!user) {
    return { error: LOGGED_OUT };
  }

  const { data: list } = await supabase
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return { error: NOT_FOUND };
  }

  const { data: rows, error: readError } = await supabase
    .from("list_items")
    .select("id")
    .eq("list_id", listId)
    .order("position", { ascending: true });

  if (readError || !rows) {
    return { error: REORDER_FAILED };
  }

  const { error } = await supabase.rpc("reorder_list_items", {
    p_list_id: listId,
    p_item_ids: mergeItemOrder(
      rows.map((row) => row.id),
      parsed.data.itemIds,
    ),
  });

  if (error) {
    return { error: REORDER_FAILED };
  }

  await touchList(supabase, listId, user.id);

  revalidateListPages();
  return { listId };
};
