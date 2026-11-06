import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { addListItem, createList, removeTitleFromList } from "@/app/list-actions";
import { AddToListButton } from "@/components/add-to-list-button";
import { getListMemberships, type ListMembership } from "@/lib/list-membership";

vi.mock("@/app/list-actions", () => ({
  addListItem: vi.fn(),
  createList: vi.fn(),
  removeTitleFromList: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/list-membership", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/list-membership")>();
  return { ...original, getListMemberships: vi.fn(original.getListMemberships) };
});

afterEach(cleanup);

beforeAll(() => {
  // jsdom doesn't implement the modal dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
});

beforeEach(() => {
  vi.mocked(addListItem).mockReset();
  vi.mocked(removeTitleFromList).mockReset();
  vi.mocked(createList).mockReset();
  vi.mocked(toast.error).mockClear();
});

const row = (id: string, extra: Partial<ListMembership> = {}): ListMembership => ({
  id,
  title: `List ${id}`,
  itemCount: 2,
  contains: false,
  ...extra,
});

const open = async (lists: ListMembership[]) => {
  vi.mocked(getListMemberships).mockResolvedValue(lists);
  render(<AddToListButton tmdbId={550} mediaType="movie" title="Fight Club" viewerId="viewer" />);
  fireEvent.click(screen.getByRole("button", { name: "Add to list" }));
  return screen.findByRole("dialog", { name: "Add to list" });
};

describe("AddToListButton", () => {
  it("loads the viewer's lists for this title on open, not before", async () => {
    vi.mocked(getListMemberships).mockClear();
    render(<AddToListButton tmdbId={550} mediaType="movie" title="Fight Club" viewerId="viewer" />);
    expect(getListMemberships).not.toHaveBeenCalled();
    cleanup();

    await open([row("a", { contains: true })]);

    expect(getListMemberships).toHaveBeenLastCalledWith(expect.anything(), "viewer", 550, "movie");
    expect(await screen.findByRole("checkbox", { name: /List a/ })).toBeChecked();
    expect(screen.getByText("Fight Club")).toBeInTheDocument();
  });

  it("adds the title on tick and updates the count", async () => {
    vi.mocked(addListItem).mockResolvedValue({ listId: "a" });
    await open([row("a")]);

    fireEvent.click(await screen.findByRole("checkbox", { name: /List a/ }));

    await waitFor(() => expect(addListItem).toHaveBeenCalledWith("a", { tmdbId: 550, mediaType: "movie" }));
    expect(await screen.findByRole("checkbox", { name: /List a/ })).toBeChecked();
    expect(screen.getByText("3 titles")).toBeInTheDocument();
  });

  it("removes the title on untick", async () => {
    vi.mocked(removeTitleFromList).mockResolvedValue({ listId: "a" });
    await open([row("a", { contains: true })]);

    fireEvent.click(await screen.findByRole("checkbox", { name: /List a/ }));

    await waitFor(() => expect(removeTitleFromList).toHaveBeenCalledWith("a", { tmdbId: 550, mediaType: "movie" }));
    expect(screen.getByText("1 title")).toBeInTheDocument();
  });

  it("rolls back and shows a toast when saving fails", async () => {
    vi.mocked(addListItem).mockResolvedValue({ error: "Failed to add the title." });
    await open([row("a")]);

    fireEvent.click(await screen.findByRole("checkbox", { name: /List a/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to add the title."));
    expect(screen.getByRole("checkbox", { name: /List a/ })).not.toBeChecked();
    expect(screen.getByText("2 titles")).toBeInTheDocument();
  });

  it("disables a full list unless the title is on it, saying so in text", async () => {
    await open([row("full", { itemCount: 100 }), row("mine", { itemCount: 100, contains: true })]);

    expect(await screen.findByRole("checkbox", { name: /List full/ })).toBeDisabled();
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /List mine/ })).toBeEnabled();
  });

  it("opens the form straight away with no lists, then adds the title to the new list", async () => {
    vi.mocked(createList).mockResolvedValue({ listId: "new" });
    vi.mocked(addListItem).mockResolvedValue({ listId: "new" });
    await open([]);

    expect(await screen.findByText("You don't have any lists yet.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: " Best sci-fi " } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("checkbox", { name: /Best sci-fi/ })).toBeChecked();
    expect((vi.mocked(createList).mock.calls[0][1] as FormData).get("title")).toBe(" Best sci-fi ");
    expect(addListItem).toHaveBeenCalledWith("new", { tmdbId: 550, mediaType: "movie" });
    expect(screen.getByText("1 title")).toBeInTheDocument();
  });

  it("reveals the form from New list and puts the new list first", async () => {
    vi.mocked(createList).mockResolvedValue({ listId: "new" });
    vi.mocked(addListItem).mockResolvedValue({ listId: "new" });
    await open([row("a")]);

    await screen.findByRole("checkbox", { name: /List a/ });
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New list" }));
    expect(screen.getByLabelText("Title")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Newest" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await screen.findByRole("checkbox", { name: /Newest/ });
    expect(screen.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent)).toEqual([
      expect.stringContaining("Newest"),
      expect.stringContaining("List a"),
    ]);
  });

  it("shows a create error at the field and keeps the text", async () => {
    vi.mocked(createList).mockResolvedValue({ error: "Give your list a title." });
    await open([]);

    await screen.findByLabelText("Title");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Give your list a title.");
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getByLabelText("Title")).toHaveValue("   ");
    expect(addListItem).not.toHaveBeenCalled();
  });

  it("shows an error when the lists can't load", async () => {
    vi.mocked(getListMemberships).mockRejectedValue(new Error("nope"));
    render(<AddToListButton tmdbId={550} mediaType="movie" title="Fight Club" viewerId="viewer" />);
    fireEvent.click(screen.getByRole("button", { name: "Add to list" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load your lists.");
  });

  it("closes with the close button and a click outside", async () => {
    const dialog = await open([row("a")]);
    await screen.findByRole("checkbox", { name: /List a/ });

    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add to list" }));
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("getListMemberships", () => {
  const actual = async () => (await vi.importActual<typeof import("@/lib/list-membership")>("@/lib/list-membership")).getListMemberships;

  const client = (lists: { data: unknown; error: unknown }, matches: { data: unknown; error: unknown } = { data: [], error: null }) => {
    const calls = { limit: 0, filters: [] as unknown[], inIds: [] as unknown };
    const supabase = {
      from: (table: string) =>
        table === "lists"
          ? {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: (limit: number) => {
                      calls.limit = limit;
                      return Promise.resolve(lists);
                    },
                  }),
                }),
              }),
            }
          : {
              select: () => {
                const chain = {
                  eq: (column: string, value: unknown) => (calls.filters.push([column, value]), chain),
                  in: (_column: string, ids: unknown) => {
                    calls.inIds = ids;
                    return Promise.resolve(matches);
                  },
                };
                return chain;
              },
            },
    } as unknown as SupabaseClient;
    return { supabase, calls };
  };

  it("marks the lists holding this title and takes counts from the database", async () => {
    const { supabase, calls } = client(
      {
        data: [
          { id: "a", title: "A", list_items: [{ count: 5 }] },
          { id: "b", title: "B", list_items: [{ count: 0 }] },
        ],
        error: null,
      },
      { data: [{ list_id: "b" }], error: null },
    );

    const lists = await (await actual())(supabase, "viewer", 550, "movie");

    expect(calls.limit).toBe(100);
    expect(calls.filters).toEqual([
      ["tmdb_id", 550],
      ["media_type", "movie"],
    ]);
    expect(calls.inIds).toEqual(["a", "b"]);
    expect(lists).toEqual([
      { id: "a", title: "A", itemCount: 5, contains: false },
      { id: "b", title: "B", itemCount: 0, contains: true },
    ]);
  });

  it("skips the second query with no lists", async () => {
    const { supabase, calls } = client({ data: [], error: null });
    expect(await (await actual())(supabase, "viewer", 550, "movie")).toEqual([]);
    expect(calls.filters).toEqual([]);
  });

  it("throws when a query fails", async () => {
    const failure = new Error("nope");
    await expect((await actual())(client({ data: null, error: failure }).supabase, "viewer", 550, "movie")).rejects.toBe(failure);
    await expect(
      (await actual())(
        client({ data: [{ id: "a", title: "A", list_items: [] }], error: null }, { data: null, error: failure }).supabase,
        "viewer",
        550,
        "movie",
      ),
    ).rejects.toBe(failure);
  });
});
