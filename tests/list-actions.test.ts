import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import {
  addListItem,
  createList,
  deleteList,
  removeListItem,
  removeTitleFromList,
  reorderListItems,
  restoreListItem,
  updateList,
} from "@/app/list-actions";
import { getUserContext } from "@/lib/supabase/auth";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  RedirectType: { replace: "replace", push: "push" },
  redirect: (path: string, type: string) => {
    throw new Error(`REDIRECT:${path}:${type}`);
  },
}));
vi.mock("@/lib/supabase/auth", () => ({ getUserContext: vi.fn() }));

const LIST_ID = "4f3c2b1a-0d9e-4c8b-a7f6-5e4d3c2b1a09";

type Result = { data: unknown; error: unknown };

/** Records the write and its filters; every chain ends in `result`. */
const useClient = (result: Result, user: { id: string } | null = { id: "owner" }) => {
  const calls = { table: "", insert: null as unknown, update: null as unknown, deleted: false, filters: [] as unknown[] };
  const chain = {
    insert: (row: unknown) => ((calls.insert = row), chain),
    update: (row: unknown) => ((calls.update = row), chain),
    delete: () => ((calls.deleted = true), chain),
    eq: (column: string, value: unknown) => (calls.filters.push([column, value]), chain),
    select: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    // A bare update, awaited without select().
    then: (resolve: (value: Result) => void) => resolve(result),
  };
  vi.mocked(getUserContext).mockResolvedValue({
    supabase: { from: (table: string) => ((calls.table = table), chain) },
    user,
  } as unknown as Awaited<ReturnType<typeof getUserContext>>);
  return calls;
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => vi.mocked(revalidatePath).mockClear());

describe("createList", () => {
  it("creates a trimmed list owned by the user, with a blank description as null", async () => {
    const calls = useClient({ data: { id: LIST_ID }, error: null });

    const state = await createList({}, form({ title: "  Best sci-fi  ", description: "   " }));

    expect(state).toEqual({ listId: LIST_ID });
    expect(calls.table).toBe("lists");
    expect(calls.insert).toEqual({ user_id: "owner", title: "Best sci-fi", description: null });
    expect(revalidatePath).toHaveBeenCalledWith("/user/[username]/lists", "page");
  });

  it.each([
    [{ title: "   " }, "Give your list a title.", "title"],
    [{}, "Give your list a title.", "title"],
    [{ title: "a".repeat(101) }, "Title can be at most 100 characters.", "title"],
    [{ title: "ok", description: "a".repeat(1001) }, "Description can be at most 1000 characters.", "description"],
  ])("rejects %j without writing and names the field", async (fields, message, field) => {
    const calls = useClient({ data: null, error: null });
    expect(await createList({}, form(fields))).toEqual({ error: message, field });
    expect(calls.insert).toBeNull();
  });

  it("accepts a title and description exactly at the limits", async () => {
    useClient({ data: { id: LIST_ID }, error: null });
    const state = await createList({}, form({ title: "a".repeat(100), description: "a".repeat(1000) }));
    expect(state).toEqual({ listId: LIST_ID });
  });

  it("requires a logged-in user", async () => {
    const calls = useClient({ data: null, error: null }, null);
    expect((await createList({}, form({ title: "List" }))).error).toMatch(/logged in/);
    expect(calls.insert).toBeNull();
  });

  it("reports a failed insert and doesn't revalidate", async () => {
    useClient({ data: null, error: { code: "500" } });
    expect((await createList({}, form({ title: "List" }))).error).toMatch(/Failed to create/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateList", () => {
  it("updates only the user's own list and bumps updated_at", async () => {
    const calls = useClient({ data: { id: LIST_ID }, error: null });

    const state = await updateList({}, form({ listId: LIST_ID, title: "New", description: "About" }));

    expect(state).toEqual({ listId: LIST_ID });
    expect(calls.update).toMatchObject({ title: "New", description: "About", updated_at: expect.any(String) });
    expect(calls.filters).toEqual([
      ["id", LIST_ID],
      ["user_id", "owner"],
    ]);
  });

  it("treats no matching row, such as someone else's list, as not found", async () => {
    useClient({ data: null, error: null });
    expect(await updateList({}, form({ listId: LIST_ID, title: "New" }))).toEqual({ error: "This list no longer exists." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an invalid list id without writing", async () => {
    const calls = useClient({ data: null, error: null });
    expect((await updateList({}, form({ listId: "nope", title: "New" }))).error).toBeDefined();
    expect(calls.update).toBeNull();
  });
});

describe("removeListItem", () => {
  const ITEM_ID = "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d";

  it("deletes the item from that list and bumps the list's updated_at", async () => {
    const calls = useClient({ data: { id: ITEM_ID }, error: null });

    expect(await removeListItem(LIST_ID, ITEM_ID)).toEqual({ listId: LIST_ID });
    expect(calls.deleted).toBe(true);
    expect(calls.filters.slice(0, 2)).toEqual([
      ["id", ITEM_ID],
      ["list_id", LIST_ID],
    ]);
    expect(calls.update).toMatchObject({ updated_at: expect.any(String) });
    expect(revalidatePath).toHaveBeenCalledWith("/user/[username]/lists/[listId]", "page");
  });

  it("treats no matching row, such as someone else's item, as gone", async () => {
    const calls = useClient({ data: null, error: null });
    expect((await removeListItem(LIST_ID, ITEM_ID)).error).toMatch(/no longer on the list/);
    expect(calls.update).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid ids and logged-out users without writing", async () => {
    const invalid = useClient({ data: null, error: null });
    expect(await removeListItem("nope", ITEM_ID)).toEqual({ error: "Invalid input" });
    expect(await removeListItem(LIST_ID, "nope")).toEqual({ error: "Invalid input" });
    expect(invalid.deleted).toBe(false);

    const loggedOut = useClient({ data: null, error: null }, null);
    expect((await removeListItem(LIST_ID, ITEM_ID)).error).toMatch(/logged in/);
    expect(loggedOut.deleted).toBe(false);
  });
});

describe("reorderListItems", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

  /** lists → maybeSingle; list_items → current rows in order; rpc → the save. */
  const useTables = ({
    list = { id: LIST_ID } as unknown,
    rows = [{ id: id(1) }, { id: id(2) }, { id: id(3) }] as unknown,
    readError = null as unknown,
    rpcError = null as unknown,
    user = { id: "owner" } as { id: string } | null,
  }) => {
    const calls = { rpc: null as unknown, touched: false, inserted: false };
    const chain = (table: string) => {
      const self = {
        select: () => self,
        eq: () => self,
        order: () => Promise.resolve({ data: rows, error: readError }),
        maybeSingle: () => Promise.resolve({ data: table === "lists" ? list : null }),
        insert: () => {
          calls.inserted = true;
          return self;
        },
        update: () => {
          calls.touched = true;
          return self;
        },
        then: (resolve: (value: { error: null }) => void) => resolve({ error: null }),
      };
      return self;
    };
    vi.mocked(getUserContext).mockResolvedValue({
      supabase: {
        from: chain,
        rpc: (name: string, args: unknown) => {
          calls.rpc = [name, args];
          return Promise.resolve({ error: rpcError });
        },
      },
      user,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>);
    return calls;
  };

  it("saves the new order, touches the list and refreshes its pages", async () => {
    const calls = useTables({});

    expect(await reorderListItems(LIST_ID, [id(3), id(1), id(2)])).toEqual({ listId: LIST_ID });

    expect(calls.rpc).toEqual(["reorder_list_items", { p_list_id: LIST_ID, p_item_ids: [id(3), id(1), id(2)] }]);
    expect(calls.touched).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/user/[username]/lists/[listId]", "page");
  });

  it("keeps rows the page didn't show in their places", async () => {
    const calls = useTables({ rows: [{ id: id(1) }, { id: id(2) }, { id: id(3) }, { id: id(4) }] });

    await reorderListItems(LIST_ID, [id(3), id(1), id(4)]);

    expect(calls.rpc).toEqual(["reorder_list_items", { p_list_id: LIST_ID, p_item_ids: [id(3), id(2), id(1), id(4)] }]);
  });

  it("drops titles removed since the page loaded", async () => {
    const calls = useTables({ rows: [{ id: id(1) }, { id: id(2) }] });

    await reorderListItems(LIST_ID, [id(2), id(3), id(1)]);

    expect(calls.rpc).toEqual(["reorder_list_items", { p_list_id: LIST_ID, p_item_ids: [id(2), id(1)] }]);
  });

  it("reports a failed save without touching the list", async () => {
    const calls = useTables({ rpcError: { code: "XX000" } });

    expect((await reorderListItems(LIST_ID, [id(2), id(1)])).error).toMatch(/new order/);
    expect(calls.touched).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a failed read without saving", async () => {
    const calls = useTables({ readError: { code: "XX000" }, rows: null });

    expect((await reorderListItems(LIST_ID, [id(2), id(1)])).error).toMatch(/new order/);
    expect(calls.rpc).toBeNull();
  });

  it("treats someone else's list as not found", async () => {
    const calls = useTables({ list: null });

    expect((await reorderListItems(LIST_ID, [id(1)])).error).toMatch(/no longer exists/);
    expect(calls.rpc).toBeNull();
  });

  it("rejects bad input and logged-out users without saving", async () => {
    const invalid = useTables({});
    expect(await reorderListItems("nope", [id(1)])).toEqual({ error: "Invalid input" });
    expect(await reorderListItems(LIST_ID, [])).toEqual({ error: "Invalid input" });
    expect(await reorderListItems(LIST_ID, ["nope"])).toEqual({ error: "Invalid input" });
    expect(await reorderListItems(LIST_ID, [id(1), id(1)])).toEqual({ error: "Invalid input" });
    expect(await reorderListItems(LIST_ID, Array.from({ length: 101 }, () => id(1)))).toEqual({ error: "Invalid input" });
    expect(invalid.rpc).toBeNull();

    const loggedOut = useTables({ user: null });
    expect((await reorderListItems(LIST_ID, [id(1)])).error).toMatch(/logged in/);
    expect(loggedOut.rpc).toBeNull();
  });
});

describe("addListItem", () => {
  const title = { tmdbId: 550, mediaType: "movie" as const };

  /** lists → maybeSingle; list_items → count, last position, insert. */
  const useTables = ({
    list = { id: LIST_ID } as unknown,
    count = 2,
    last = { position: 4 } as unknown,
    insertError = null as unknown,
    user = { id: "owner" } as { id: string } | null,
  }) => {
    const calls = { insert: null as unknown, touched: false };
    const chain = (table: string) => {
      const self = {
        select: () => self,
        eq: () => self,
        order: () => self,
        limit: () => self,
        maybeSingle: () => Promise.resolve({ data: table === "lists" ? list : last }),
        insert: (row: unknown) => {
          calls.insert = row;
          return Promise.resolve({ error: insertError });
        },
        update: () => {
          calls.touched = true;
          return self;
        },
        then: (resolve: (value: unknown) => void) => resolve({ count, error: null }),
      };
      return self;
    };
    vi.mocked(getUserContext).mockResolvedValue({
      supabase: { from: chain },
      user,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>);
    return calls;
  };

  it("adds the title after the last position and bumps updated_at", async () => {
    const calls = useTables({});
    expect(await addListItem(LIST_ID, title)).toEqual({ listId: LIST_ID });
    expect(calls.insert).toEqual({ list_id: LIST_ID, tmdb_id: 550, media_type: "movie", position: 5 });
    expect(calls.touched).toBe(true);
  });

  it("starts an empty list at position 0", async () => {
    const calls = useTables({ count: 0, last: null });
    await addListItem(LIST_ID, title);
    expect(calls.insert).toMatchObject({ position: 0 });
  });

  it("rejects a list that isn't the user's without writing", async () => {
    const calls = useTables({ list: null });
    expect(await addListItem(LIST_ID, title)).toEqual({ error: "This list no longer exists." });
    expect(calls.insert).toBeNull();
  });

  it("rejects a full list without writing", async () => {
    const calls = useTables({ count: 100 });
    expect(await addListItem(LIST_ID, title)).toEqual({ error: "This list is full (100 titles)." });
    expect(calls.insert).toBeNull();
  });

  it("reads the trigger's rejection as a full list", async () => {
    useTables({ insertError: { code: "P0001" } });
    expect(await addListItem(LIST_ID, title)).toEqual({ error: "This list is full (100 titles)." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("treats a title already on the list as success", async () => {
    useTables({ insertError: { code: "23505" } });
    expect(await addListItem(LIST_ID, title)).toEqual({ listId: LIST_ID });
  });

  it("reports other insert failures", async () => {
    useTables({ insertError: { code: "500" } });
    expect((await addListItem(LIST_ID, title)).error).toMatch(/Failed to add/);
  });

  it("rejects invalid input and logged-out users without writing", async () => {
    const invalid = useTables({});
    expect(await addListItem("nope", title)).toEqual({ error: "Invalid input" });
    expect(await addListItem(LIST_ID, { tmdbId: -1, mediaType: "movie" })).toEqual({ error: "Invalid input" });
    expect(invalid.insert).toBeNull();

    const loggedOut = useTables({ user: null });
    expect((await addListItem(LIST_ID, title)).error).toMatch(/logged in/);
    expect(loggedOut.insert).toBeNull();
  });
});

describe("removeTitleFromList", () => {
  const title = { tmdbId: 550, mediaType: "movie" as const };

  it("deletes that title from that list and bumps updated_at", async () => {
    const calls = useClient({ data: null, error: null });

    expect(await removeTitleFromList(LIST_ID, title)).toEqual({ listId: LIST_ID });
    expect(calls.deleted).toBe(true);
    expect(calls.filters.slice(0, 3)).toEqual([
      ["list_id", LIST_ID],
      ["tmdb_id", 550],
      ["media_type", "movie"],
    ]);
    expect(calls.update).toMatchObject({ updated_at: expect.any(String) });
  });

  it("reports a failed delete", async () => {
    useClient({ data: null, error: { code: "500" } });
    expect((await removeTitleFromList(LIST_ID, title)).error).toMatch(/Failed to remove/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid input and logged-out users without writing", async () => {
    const invalid = useClient({ data: null, error: null });
    expect(await removeTitleFromList("nope", title)).toEqual({ error: "Invalid input" });
    expect(invalid.deleted).toBe(false);

    const loggedOut = useClient({ data: null, error: null }, null);
    expect((await removeTitleFromList(LIST_ID, title)).error).toMatch(/logged in/);
    expect(loggedOut.deleted).toBe(false);
  });
});

describe("restoreListItem", () => {
  const item = { tmdbId: 550, mediaType: "movie" as const, position: 3 };

  it("puts the title back at its old position and bumps updated_at", async () => {
    const calls = useClient({ data: null, error: null });

    expect(await restoreListItem(LIST_ID, item)).toEqual({ listId: LIST_ID });
    expect(calls.insert).toEqual({ list_id: LIST_ID, tmdb_id: 550, media_type: "movie", position: 3 });
    expect(calls.update).toMatchObject({ updated_at: expect.any(String) });
  });

  it("treats an already restored title as success", async () => {
    useClient({ data: null, error: { code: "23505" } });
    expect(await restoreListItem(LIST_ID, item)).toEqual({ listId: LIST_ID });
  });

  it("reports other failures, such as a full list, without revalidating", async () => {
    useClient({ data: null, error: { code: "P0001" } });
    expect((await restoreListItem(LIST_ID, item)).error).toMatch(/Couldn't put the title back/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid input and logged-out users without writing", async () => {
    const invalid = useClient({ data: null, error: null });
    expect(await restoreListItem(LIST_ID, { ...item, position: -1 })).toEqual({ error: "Invalid input" });
    expect(await restoreListItem("nope", item)).toEqual({ error: "Invalid input" });
    expect(invalid.insert).toBeNull();

    const loggedOut = useClient({ data: null, error: null }, null);
    expect((await restoreListItem(LIST_ID, item)).error).toMatch(/logged in/);
    expect(loggedOut.insert).toBeNull();
  });
});

describe("deleteList", () => {
  it("deletes only the user's own list, then replaces the page with their lists", async () => {
    const calls = useClient({ data: { id: LIST_ID, username: "bob" }, error: null });

    await expect(deleteList({}, form({ listId: LIST_ID }))).rejects.toThrow("REDIRECT:/user/bob/lists?deleted=1:replace");
    expect(calls.deleted).toBe(true);
    expect(calls.filters.slice(0, 2)).toEqual([
      ["id", LIST_ID],
      ["user_id", "owner"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/user/[username]/lists", "page");
  });

  it("treats no matching row as not found", async () => {
    useClient({ data: null, error: null });
    expect(await deleteList({}, form({ listId: LIST_ID }))).toEqual({ error: "This list no longer exists." });
  });

  it("rejects an invalid id without writing", async () => {
    const calls = useClient({ data: null, error: null });
    expect(await deleteList({}, form({ listId: "nope" }))).toEqual({ error: "Invalid input" });
    expect(calls.deleted).toBe(false);
  });
});
