"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/supabase/auth";
import { listFieldsSchema, listIdSchema, listUpdateSchema } from "@/lib/validation/list";

/** `listId` is the list acted on, set on success. */
export type ListActionState = { error?: string; listId?: string };

const NOT_FOUND = "This list no longer exists.";
const LOGGED_OUT = "You must be logged in to manage lists.";

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
    return { error: parsed.error.issues[0].message };
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
    return { error: parsed.error.issues[0].message };
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

  revalidateListPages();
  return { listId: parsed.data };
};
