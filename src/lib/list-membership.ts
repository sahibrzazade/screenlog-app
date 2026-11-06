import type { SupabaseClient } from "@supabase/supabase-js";

/** Lists the add-to-list modal shows. Far above normal use; keeps the query bounded. */
export const ADD_TO_LIST_MAX_LISTS = 100;

export type ListMembership = {
  id: string;
  title: string;
  itemCount: number;
  /** Whether this title is on the list. */
  contains: boolean;
};

type ListRow = { id: string; title: string; list_items: { count: number }[] };

/**
 * The viewer's lists, most recently updated first, and which hold this title.
 * Runs in the browser, so this file must not import the TMDB client. Throws on
 * failure so the modal can show an error instead of looking empty.
 */
export const getListMemberships = async (
  supabase: SupabaseClient,
  viewerId: string,
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<ListMembership[]> => {
  const { data, error } = await supabase
    .from("lists")
    .select("id, title, list_items(count)")
    .eq("user_id", viewerId)
    .order("updated_at", { ascending: false })
    .limit(ADD_TO_LIST_MAX_LISTS);

  if (error) throw error;

  const lists = (data ?? []) as unknown as ListRow[];
  if (lists.length === 0) return [];

  const { data: matches, error: matchError } = await supabase
    .from("list_items")
    .select("list_id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .in(
      "list_id",
      lists.map((list) => list.id),
    );

  if (matchError) throw matchError;

  const containing = new Set((matches ?? []).map((match) => match.list_id as string));

  return lists.map((list) => ({
    id: list.id,
    title: list.title,
    itemCount: list.list_items[0]?.count ?? 0,
    contains: containing.has(list.id),
  }));
};
