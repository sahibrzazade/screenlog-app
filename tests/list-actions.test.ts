import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";
import { createList, deleteList, updateList } from "@/app/list-actions";
import { getUserContext } from "@/lib/supabase/auth";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
    [{ title: "   " }, "Give your list a title."],
    [{}, "Give your list a title."],
    [{ title: "a".repeat(101) }, "Title can be at most 100 characters."],
    [{ title: "ok", description: "a".repeat(1001) }, "Description can be at most 1000 characters."],
  ])("rejects %j without writing", async (fields, message) => {
    const calls = useClient({ data: null, error: null });
    expect(await createList({}, form(fields))).toEqual({ error: message });
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

describe("deleteList", () => {
  it("deletes only the user's own list", async () => {
    const calls = useClient({ data: { id: LIST_ID }, error: null });

    expect(await deleteList({}, form({ listId: LIST_ID }))).toEqual({ listId: LIST_ID });
    expect(calls.deleted).toBe(true);
    expect(calls.filters).toEqual([
      ["id", LIST_ID],
      ["user_id", "owner"],
    ]);
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
