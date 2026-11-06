import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserLists, LISTS_PAGE_SIZE, type ListCardData } from "@/lib/lists";
import { ListCards } from "@/components/list-cards";
import { ListFormDialog } from "@/components/list-form-dialog";
import { resolveMediaCardItem } from "@/lib/tmdb/resolve-media-card-item";

vi.mock("@/lib/tmdb/resolve-media-card-item", () => ({ resolveMediaCardItem: vi.fn() }));
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
});

/** lists: count (select → eq) and page (select → eq → order → range); list_items: select → in → order. */
const fakeClient = (count: number | null, lists: unknown[] | null, items: unknown[] = []) => {
  const calls = { range: [] as number[], itemListIds: [] as unknown };
  const client = {
    from: (table: string) =>
      table === "lists"
        ? {
            select: () => ({
              eq: () =>
                Object.assign(Promise.resolve({ count }), {
                  order: () => ({
                    range: (from: number, to: number) => {
                      calls.range = [from, to];
                      return Promise.resolve({ data: lists });
                    },
                  }),
                }),
            }),
          }
        : {
            select: () => ({
              in: (_column: string, ids: unknown) => {
                calls.itemListIds = ids;
                return { order: () => Promise.resolve({ data: items }) };
              },
            }),
          },
  } as unknown as SupabaseClient;
  return { client, calls };
};

const media = (id: number) => ({ id, mediaType: "movie" as const, title: `Title ${id}`, year: "2021", posterPath: `/${id}.jpg` });
const item = (listId: string, id: number) => ({ list_id: listId, tmdb_id: id, media_type: "movie" });

describe("getUserLists", () => {
  it("counts every item but resolves only the first four posters", async () => {
    vi.mocked(resolveMediaCardItem).mockClear();
    vi.mocked(resolveMediaCardItem).mockImplementation(async (id) => media(id));
    const { client } = fakeClient(1, [{ id: "a", title: "A", description: null }], [1, 2, 3, 4, 5, 6].map((id) => item("a", id)));

    const { lists } = await getUserLists(client, "user", undefined);

    expect(lists[0].itemCount).toBe(6);
    expect(lists[0].posters.map((poster) => poster.id)).toEqual([1, 2, 3, 4]);
    expect(resolveMediaCardItem).toHaveBeenCalledTimes(4);
  });

  it("keeps each list's own items and leaves out unresolvable posters", async () => {
    vi.mocked(resolveMediaCardItem).mockImplementation(async (id) => (id === 2 ? null : media(id)));
    const { client, calls } = fakeClient(
      2,
      [
        { id: "a", title: "A", description: "About" },
        { id: "b", title: "B", description: null },
      ],
      [item("a", 1), item("a", 2), item("b", 3)],
    );

    const { lists } = await getUserLists(client, "user", undefined);

    expect(calls.itemListIds).toEqual(["a", "b"]);
    expect(lists[0]).toMatchObject({ id: "a", description: "About", itemCount: 2 });
    expect(lists[0].posters.map((poster) => poster.id)).toEqual([1]);
    expect(lists[1]).toMatchObject({ id: "b", itemCount: 1 });
  });

  it("asks the database for one page and clamps an out-of-range page", async () => {
    const { client, calls } = fakeClient(LISTS_PAGE_SIZE + 1, [{ id: "a", title: "A", description: null }]);

    const result = await getUserLists(client, "user", "9");

    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(2);
    expect(calls.range).toEqual([LISTS_PAGE_SIZE, LISTS_PAGE_SIZE * 2 - 1]);
  });

  it("returns no lists on a failed query or none at all", async () => {
    const empty = await getUserLists(fakeClient(0, []).client, "user", undefined);
    expect(empty).toEqual({ lists: [], currentPage: 1, totalPages: 1 });

    const failed = await getUserLists(fakeClient(null, null).client, "user", undefined);
    expect(failed.lists).toEqual([]);
  });
});

describe("ListCards", () => {
  const card = (extra: Partial<ListCardData> = {}): ListCardData => ({
    id: "a",
    title: "Best sci-fi",
    description: null,
    itemCount: 2,
    posters: [media(1)],
    ...extra,
  });

  it("links the card to the list and shows the count", () => {
    render(<ListCards lists={[card()]} username="bob" />);
    expect(screen.getByRole("link", { name: /Best sci-fi/ })).toHaveAttribute("href", "/user/bob/lists/a");
    expect(screen.getByText("2 titles")).toBeInTheDocument();
  });

  it("uses the singular and shows a description when there is one", () => {
    render(<ListCards lists={[card({ itemCount: 1, description: "About" })]} username="bob" />);
    expect(screen.getByText("1 title")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });
});

describe("ListFormDialog", () => {
  const renderDialog = (action = vi.fn(), onSuccess = vi.fn(), onClose = vi.fn()) => {
    render(
      <ListFormDialog
        dialogTitle="New list"
        submitLabel="Create list"
        action={action}
        onSuccess={onSuccess}
        onClose={onClose}
      />,
    );
    return { action, onSuccess, onClose };
  };

  it("opens with labelled fields and limits their length", () => {
    renderDialog();
    expect(screen.getByRole("dialog", { name: "New list" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Description (optional)")).toHaveAttribute("maxlength", "1000");
  });

  it("calls onSuccess with the new list's id", async () => {
    const { action, onSuccess } = renderDialog(vi.fn().mockResolvedValue({ listId: "new-id" }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Best sci-fi" } });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("new-id"));
    expect((action.mock.calls[0][1] as FormData).get("title")).toBe("Best sci-fi");
  });

  it("shows a server error and keeps what was typed", async () => {
    const { onSuccess } = renderDialog(vi.fn().mockResolvedValue({ error: "Failed to create the list." }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Best sci-fi" } });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to create the list.");
    expect(screen.getByLabelText("Title")).toHaveValue("Best sci-fi");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows a field error at that field, linked to it and focused", async () => {
    renderDialog(vi.fn().mockResolvedValue({ error: "Give your list a title.", field: "title" }));

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    const alert = await screen.findByRole("alert");
    const input = screen.getByLabelText("Title");
    expect(alert).toHaveTextContent("Give your list a title.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    await waitFor(() => expect(input).toHaveFocus());
    expect(screen.getByLabelText("Description (optional)")).not.toHaveAttribute("aria-invalid");
  });

  it("stays open on a click outside, keeping what was typed", () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("prefills an existing list and submits its id", async () => {
    const action = vi.fn().mockResolvedValue({ listId: "a" });
    render(
      <ListFormDialog
        dialogTitle="Edit list"
        submitLabel="Save changes"
        action={action}
        list={{ id: "a", title: "Old", description: "About" }}
        onSuccess={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Old");
    expect(screen.getByLabelText("Description (optional)")).toHaveValue("About");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect((action.mock.calls[0][1] as FormData).get("listId")).toBe("a");
  });

  it("closes with the close button", () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
