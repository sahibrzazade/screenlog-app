import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { act, render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import type { DragEndEvent } from "@dnd-kit/core";
import { addListItem, deleteList, removeListItem, reorderListItems, restoreListItem, updateList } from "@/app/list-actions";
import { ListItemsGrid } from "@/components/list-items-grid";
import { ListOwnerActions } from "@/components/list-owner-actions";
import { getList, getListItems, type ListItem } from "@/lib/lists";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";

vi.mock("@/lib/tmdb/resolve-media-card-item", () => ({ resolveMediaCardItem: vi.fn() }));
vi.mock("@/components/watchlist-button", () => ({ WatchlistButton: () => null }));
vi.mock("@/app/list-actions", () => ({
  createList: vi.fn(),
  updateList: vi.fn(),
  deleteList: vi.fn(),
  addListItem: vi.fn(),
  removeListItem: vi.fn(),
  reorderListItems: vi.fn(),
  restoreListItem: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// jsdom has no layout to drag across, so tests finish a drag through DndContext's handler.
const dnd = vi.hoisted(() => ({ onDragEnd: undefined as undefined | ((event: DragEndEvent) => void) }));
vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      dnd.onDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});
vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(cleanup);

beforeAll(() => {
  // jsdom doesn't implement the modal dialog methods.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

const item = (id: number): ListItem => ({
  itemId: `item-${id}`,
  position: id,
  id,
  mediaType: "movie",
  title: `Title ${id}`,
  year: "2021",
  posterPath: null,
});

describe("getList", () => {
  it("filters by both the list and its owner", async () => {
    const filters: unknown[] = [];
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => (filters.push([column, value]), chain),
      maybeSingle: () => Promise.resolve({ data: null }),
    };
    const client = { from: () => chain } as unknown as SupabaseClient;

    expect(await getList(client, "list", "owner")).toBeNull();
    expect(filters).toEqual([
      ["id", "list"],
      ["user_id", "owner"],
    ]);
  });
});

describe("getListItems", () => {
  it("keeps order, leaves out unresolvable titles and counts every row", async () => {
    vi.mocked(resolveMediaCardItem).mockImplementation(async (id) => (id === 2 ? null : item(id)));
    const rows = [1, 2, 3].map((id) => ({ id: `row-${id}`, tmdb_id: id, media_type: "movie", position: id * 10 }));
    const chain = { select: () => chain, eq: () => chain, order: () => Promise.resolve({ data: rows }) };
    const client = { from: () => chain } as unknown as SupabaseClient;

    const { items, total } = await getListItems(client, "list");

    expect(total).toBe(3);
    expect(items.map((listItem) => [listItem.itemId, listItem.position])).toEqual([
      ["row-1", 10],
      ["row-3", 30],
    ]);
  });
});

describe("ListItemsGrid", () => {
  it("numbers the titles in order and links them", () => {
    render(<ListItemsGrid listId="list" items={[item(1), item(2)]} editable={false} />);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("1")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link")).toHaveAttribute("href", "/movie/2");
  });

  it("shows no remove buttons to visitors", () => {
    render(<ListItemsGrid listId="list" items={[item(1)]} editable={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("removes a title for the owner, with a toast", async () => {
    vi.mocked(removeListItem).mockResolvedValue({ listId: "list" });
    render(<ListItemsGrid listId="list" items={[item(1)]} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Title 1 from list" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(vi.mocked(toast.success).mock.calls[0][0]).toBe("Removed from list");
    expect(removeListItem).toHaveBeenCalledWith("list", "item-1");
  });

  it("offers Undo, restoring the title to its old position", async () => {
    vi.mocked(removeListItem).mockResolvedValue({ listId: "list" });
    vi.mocked(restoreListItem).mockResolvedValue({ listId: "list" });
    render(<ListItemsGrid listId="list" items={[{ ...item(1), position: 4 }]} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Title 1 from list" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as { action: { label: string; onClick: () => void } };
    expect(options.action.label).toBe("Undo");
    options.action.onClick();

    expect(restoreListItem).toHaveBeenCalledWith("list", { tmdbId: 1, mediaType: "movie", position: 4 });
  });

  it("shows an error when Undo fails", async () => {
    vi.mocked(removeListItem).mockResolvedValue({ listId: "list" });
    vi.mocked(restoreListItem).mockResolvedValue({ error: "Couldn't put the title back." });
    render(<ListItemsGrid listId="list" items={[item(1)]} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Title 1 from list" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    const options = vi.mocked(toast.success).mock.calls[0][1] as unknown as { action: { onClick: () => void } };
    options.action.onClick();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't put the title back."));
  });

  it("puts a title back and shows the error when removing fails", async () => {
    vi.mocked(removeListItem).mockResolvedValue({ error: "Failed to remove the title." });
    render(<ListItemsGrid listId="list" items={[item(1)]} editable />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Title 1 from list" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to remove the title."));
    await waitFor(() => expect(screen.getByRole("link")).toBeInTheDocument());
  });

  describe("adding", () => {
    const openSlot = () => screen.getByRole("button", { name: "Add a title to this list" });

    /** Answers every search with a movie and a show that share TMDB id 1. */
    const mockSearch = () =>
      vi.spyOn(global, "fetch").mockImplementation(async (input) => {
        const results = String(input).includes("type=tv")
          ? [{ id: 1, name: "Show One", poster_path: null, first_air_date: "2020-01-01" }]
          : [
              { id: 1, title: "Title 1", poster_path: null, release_date: "2020-01-01" },
              { id: 9, title: "Movie Nine", poster_path: null, release_date: "2021-01-01" },
            ];
        return new Response(JSON.stringify({ page: 1, results, total_pages: 1, total_results: results.length }), {
          status: 200,
        });
      });

    const search = async (text: string) => {
      fireEvent.click(openSlot());
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: text } });
    };

    beforeEach(() => vi.mocked(addListItem).mockReset());
    afterEach(() => vi.restoreAllMocks());

    it("shows the owner a slot, and no one else or a full list", () => {
      const { unmount } = render(<ListItemsGrid listId="list" items={[item(1)]} editable />);
      expect(openSlot()).toBeInTheDocument();
      unmount();

      const full = render(<ListItemsGrid listId="list" items={[item(1)]} editable isFull />);
      expect(screen.queryByRole("button", { name: "Add a title to this list" })).not.toBeInTheDocument();
      full.unmount();

      render(<ListItemsGrid listId="list" items={[item(1)]} editable={false} />);
      expect(screen.queryByRole("button", { name: "Add a title to this list" })).not.toBeInTheDocument();
    });

    it("focuses the search on opening", () => {
      render(<ListItemsGrid listId="list" items={[]} editable />);
      fireEvent.click(openSlot());
      expect(screen.getByRole("searchbox")).toHaveFocus();
    });

    it("adds the picked title, closes the panel and returns focus to the slot", async () => {
      mockSearch();
      vi.mocked(addListItem).mockResolvedValue({ listId: "list" });
      render(<ListItemsGrid listId="list" items={[]} editable />);

      await search("movie");
      fireEvent.click(await screen.findByRole("button", { name: /Movie Nine/ }));

      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
      expect(openSlot()).toHaveFocus();
      await waitFor(() => expect(addListItem).toHaveBeenCalledWith("list", { tmdbId: 9, mediaType: "movie" }));
    });

    it("shows the title dimmed while it saves", async () => {
      mockSearch();
      let finishAdd: (result: { listId: string }) => void = () => {};
      vi.mocked(addListItem).mockReturnValue(new Promise((resolve) => (finishAdd = resolve)));
      render(<ListItemsGrid listId="list" items={[]} editable />);

      await search("movie");
      fireEvent.click(await screen.findByRole("button", { name: /Movie Nine/ }));

      await waitFor(() => expect(screen.getByRole("link", { name: /Movie Nine/ }).closest("li")).toHaveAttribute("aria-busy"));

      // React entangles async transitions: one left pending would hold up later tests.
      await act(async () => finishAdd({ listId: "list" }));
    });

    it("removes the title and shows the error when adding fails", async () => {
      mockSearch();
      vi.mocked(addListItem).mockResolvedValue({ error: "This list is full (100 titles)." });
      render(<ListItemsGrid listId="list" items={[]} editable />);

      await search("movie");
      fireEvent.click(await screen.findByRole("button", { name: /Movie Nine/ }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This list is full (100 titles)."));
      await waitFor(() => expect(screen.queryByRole("link", { name: /Movie Nine/ })).not.toBeInTheDocument());
    });

    it("blocks titles on the list by media type, not id alone", async () => {
      mockSearch();
      render(<ListItemsGrid listId="list" items={[item(1)]} editable />);

      await search("one");
      expect(await screen.findByRole("button", { name: /Title 1.*Already picked/ })).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Shows" }));

      expect(await screen.findByRole("button", { name: /Show One/ })).toBeEnabled();
    });
  });

  describe("reordering", () => {
    const drag = (activeId: string, overId: string | null) =>
      act(() =>
        dnd.onDragEnd?.({
          active: { id: activeId },
          over: overId ? { id: overId } : null,
        } as unknown as DragEndEvent),
      );
    const linkOrder = () => screen.getAllByRole("link").map((link) => link.getAttribute("href"));

    beforeEach(() => vi.mocked(reorderListItems).mockReset());

    it("gives the owner a named drag handle showing the position, and visitors none", () => {
      const { unmount } = render(<ListItemsGrid listId="list" items={[item(1), item(2)]} editable />);
      expect(screen.getByRole("button", { name: "Reorder Title 2, position 2" })).toHaveTextContent("2");
      unmount();

      render(<ListItemsGrid listId="list" items={[item(1)]} editable={false} />);
      expect(screen.queryByRole("button", { name: /Reorder/ })).not.toBeInTheDocument();
    });

    it("moves the title at once and saves the new order", async () => {
      let finishSave: (result: { listId: string }) => void = () => {};
      vi.mocked(reorderListItems).mockReturnValue(new Promise((resolve) => (finishSave = resolve)));
      render(<ListItemsGrid listId="list" items={[item(1), item(2), item(3)]} editable />);

      drag("item-3", "item-1");

      await waitFor(() => expect(linkOrder()).toEqual(["/movie/3", "/movie/1", "/movie/2"]));
      expect(reorderListItems).toHaveBeenCalledWith("list", ["item-3", "item-1", "item-2"]);

      // React entangles async transitions: one left pending would hold up later tests.
      await act(async () => finishSave({ listId: "list" }));
    });

    it("restores the old order and shows the error when the save fails", async () => {
      vi.mocked(reorderListItems).mockResolvedValue({ error: "Couldn't save the new order." });
      render(<ListItemsGrid listId="list" items={[item(1), item(2)]} editable />);

      drag("item-2", "item-1");

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't save the new order."));
      await waitFor(() => expect(linkOrder()).toEqual(["/movie/1", "/movie/2"]));
    });

    it.each([
      ["onto itself", "item-1"],
      ["outside the grid", null],
    ])("saves nothing when a title is dropped %s", (_case, overId) => {
      render(<ListItemsGrid listId="list" items={[item(1), item(2)]} editable />);

      drag("item-1", overId);

      expect(reorderListItems).not.toHaveBeenCalled();
    });
  });
});

describe("ListOwnerActions", () => {
  const list = { id: "list", title: "Best sci-fi", description: "About" };

  it("edits through a prefilled form and closes it on success", async () => {
    vi.mocked(updateList).mockResolvedValue({ listId: "list" });
    render(<ListOwnerActions list={list} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Best sci-fi");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Changes saved"));
    await waitFor(() => expect(screen.queryByLabelText("Title")).not.toBeInTheDocument());
  });

  it("deletes only after confirmation, naming the list", async () => {
    vi.mocked(deleteList).mockResolvedValue({});
    render(<ListOwnerActions list={list} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteList).not.toHaveBeenCalled();
    expect(screen.getByText('Delete "Best sci-fi"?')).toBeInTheDocument();

    const dialog = screen.getByText('Delete "Best sci-fi"?').closest("dialog") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteList).toHaveBeenCalled());
    expect((vi.mocked(deleteList).mock.calls[0][1] as FormData).get("listId")).toBe("list");
  });

  it("shows a failed delete in the dialog", async () => {
    vi.mocked(deleteList).mockResolvedValue({ error: "Failed to delete the list." });
    render(<ListOwnerActions list={list} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByText('Delete "Best sci-fi"?').closest("dialog") as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Failed to delete the list.");
  });
});
