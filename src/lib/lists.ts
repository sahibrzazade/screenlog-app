import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaCardItem } from "@/components/media-card";
import { parsePage } from "@/lib/pagination";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";

export const LISTS_PAGE_SIZE = 20;
export const LIST_CARD_POSTERS = 4;

export type ListCardData = {
  id: string;
  title: string;
  description: string | null;
  itemCount: number;
  /** Up to LIST_CARD_POSTERS of the first titles; ones TMDB can't resolve are left out. */
  posters: MediaCardItem[];
};

type ListRow = { id: string; title: string; description: string | null; list_items: { count: number }[] };
type ListItemRow = { tmdb_id: number; media_type: "movie" | "tv" };

export type ListDetails = { id: string; title: string; description: string | null };

/** A title on a list; `itemId` and `position` come from its `list_items` row. */
export type ListItem = MediaCardItem & { itemId: string; position: number };

/**
 * A list, only if it belongs to this owner, so a list id under the wrong
 * username reads as missing. A malformed id fails the query and is missing too.
 */
export const getList = async (
  supabase: SupabaseClient,
  listId: string,
  ownerId: string,
): Promise<ListDetails | null> => {
  const { data } = await supabase
    .from("lists")
    .select("id, title, description")
    .eq("id", listId)
    .eq("user_id", ownerId)
    .maybeSingle();
  return data;
};

/**
 * A list's titles in order. `total` counts every row, including titles TMDB
 * can't resolve, which are left out of `items`. Resolves them all: the 0019
 * trigger caps a list at 100.
 */
export const getListItems = async (
  supabase: SupabaseClient,
  listId: string,
): Promise<{ items: ListItem[]; total: number }> => {
  const { data } = await supabase
    .from("list_items")
    .select("id, tmdb_id, media_type, position")
    .eq("list_id", listId)
    .order("position", { ascending: true });
  const rows = (data ?? []) as { id: string; tmdb_id: number; media_type: "movie" | "tv"; position: number }[];

  const resolved = await Promise.all(
    rows.map(async (row) => {
      const item = await resolveMediaCardItem(row.tmdb_id, row.media_type);
      return item ? { ...item, itemId: row.id, position: row.position } : null;
    }),
  );

  return { items: resolved.filter((item): item is ListItem => item !== null), total: rows.length };
};

/** How many lists a user has. Lists are publicly readable (0019). */
export const getListCount = async (supabase: SupabaseClient, userId: string): Promise<number> => {
  const { count } = await supabase
    .from("lists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
};

/**
 * One page of a user's lists, most recently updated first. Paginates in the
 * query because the number of lists is unlimited. The database counts the
 * items, and each card reads only the rows it shows, so a page of full lists
 * can't hit the API's row limit and TMDB is only asked about those few titles.
 */
export const getUserLists = async (
  supabase: SupabaseClient,
  userId: string,
  rawPage: string | string[] | undefined,
): Promise<{ lists: ListCardData[]; currentPage: number; totalPages: number }> => {
  const total = await getListCount(supabase, userId);
  const totalPages = Math.max(1, Math.ceil(total / LISTS_PAGE_SIZE));
  const currentPage = parsePage(rawPage, totalPages);
  const from = (currentPage - 1) * LISTS_PAGE_SIZE;

  const { data } = await supabase
    .from("lists")
    .select("id, title, description, list_items(count)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, from + LISTS_PAGE_SIZE - 1);
  const lists = data as unknown as ListRow[] | null;

  if (!lists || lists.length === 0) {
    return { lists: [], currentPage, totalPages };
  }

  const cards = await Promise.all(
    lists.map(async (list) => {
      const { data: items } = await supabase
        .from("list_items")
        .select("tmdb_id, media_type")
        .eq("list_id", list.id)
        .order("position", { ascending: true })
        .limit(LIST_CARD_POSTERS);
      const posters = await Promise.all(
        ((items ?? []) as ListItemRow[]).map((item) => resolveMediaCardItem(item.tmdb_id, item.media_type)),
      );
      return {
        id: list.id,
        title: list.title,
        description: list.description,
        itemCount: list.list_items[0]?.count ?? 0,
        posters: posters.filter((poster): poster is MediaCardItem => poster !== null),
      };
    }),
  );

  return { lists: cards, currentPage, totalPages };
};
