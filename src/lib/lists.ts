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

type ListItemRow = { list_id: string; tmdb_id: number; media_type: "movie" | "tv" };

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
 * query because the number of lists is unlimited. Item rows are read whole:
 * the 0019 trigger caps them at 100 per list, so a page stays bounded, and
 * TMDB is only asked about the few titles a card shows.
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

  const { data: lists } = await supabase
    .from("lists")
    .select("id, title, description")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, from + LISTS_PAGE_SIZE - 1);

  if (!lists || lists.length === 0) {
    return { lists: [], currentPage, totalPages };
  }

  const { data: items } = await supabase
    .from("list_items")
    .select("list_id, tmdb_id, media_type")
    .in(
      "list_id",
      lists.map((list) => list.id),
    )
    .order("position", { ascending: true });

  const itemsByList = Map.groupBy((items ?? []) as ListItemRow[], (item) => item.list_id);

  const cards = await Promise.all(
    lists.map(async (list) => {
      const listItems = itemsByList.get(list.id) ?? [];
      const posters = await Promise.all(
        listItems
          .slice(0, LIST_CARD_POSTERS)
          .map((item) => resolveMediaCardItem(item.tmdb_id, item.media_type)),
      );
      return {
        id: list.id,
        title: list.title,
        description: list.description,
        itemCount: listItems.length,
        posters: posters.filter((poster): poster is MediaCardItem => poster !== null),
      };
    }),
  );

  return { lists: cards, currentPage, totalPages };
};
