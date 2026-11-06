import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { deleteList, removeListItem, restoreListItem, updateList } from "@/app/list-actions";
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
  removeListItem: vi.fn(),
  restoreListItem: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
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
