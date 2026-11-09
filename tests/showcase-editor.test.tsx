import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { ShowcaseEditor } from "@/components/showcase-editor";
import type { MediaCardItem } from "@/components/media-card";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockAction = vi.fn().mockResolvedValue({ success: true });

const mockSearchResponse = (results: unknown[]) => {
  vi.spyOn(global, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ page: 1, results, total_pages: 1, total_results: results.length }),
      { status: 200 },
    ),
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  mockAction.mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe("ShowcaseEditor", () => {
  it("closes and resets the search picker after selecting an item", async () => {
    mockSearchResponse([
      { id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" },
    ]);

    render(
      <ShowcaseEditor mediaType="movie" label="Top 4 movies" initialItems={[]} action={mockAction} />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Add a movie" })[0]);
    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "matrix" } });

    const result = await screen.findByRole("button", { name: /the matrix/i });
    fireEvent.click(result);

    await waitFor(() => expect(mockAction).toHaveBeenCalled());
    expect(screen.queryByLabelText("Search")).not.toBeInTheDocument();
    expect(screen.queryByText("Search movies")).not.toBeInTheDocument();
  });

  it("reopens with an empty query the next time it's opened", async () => {
    mockSearchResponse([
      { id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" },
    ]);

    render(
      <ShowcaseEditor mediaType="movie" label="Top 4 movies" initialItems={[]} action={mockAction} />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Add a movie" })[0]);
    fireEvent.change(await screen.findByLabelText("Search"), { target: { value: "matrix" } });
    fireEvent.click(await screen.findByRole("button", { name: /the matrix/i }));
    await waitFor(() => expect(mockAction).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "Add a movie" })[0]);
    expect(await screen.findByLabelText("Search")).toHaveValue("");
  });
});

const dune: MediaCardItem = { id: 438631, mediaType: "movie", title: "Dune", year: "2021", posterPath: null };
const matrix: MediaCardItem = { id: 603, mediaType: "movie", title: "The Matrix", year: "1999", posterPath: null };

const removeButtons = () => screen.queryAllByRole("button", { name: /^Remove / });

describe("ShowcaseEditor saving", () => {
  it("puts the saved titles back and toasts the error when saving fails", async () => {
    let fail: (state: { error: string }) => void = () => {};
    const action = vi.fn(() => new Promise<{ error: string }>((resolve) => (fail = resolve)));

    render(<ShowcaseEditor mediaType="movie" label="Top 4 movies" initialItems={[dune, matrix]} action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Dune" }));

    // Shown removed while saving…
    await waitFor(() => expect(removeButtons().map((b) => b.getAttribute("aria-label"))).toEqual(["Remove The Matrix"]));
    expect(JSON.parse((action.mock.calls[0] as unknown as [unknown, FormData])[1].get("ids") as string)).toEqual([603]);

    fail({ error: "Failed to save. Please try again." });

    // …and back once the save fails.
    await waitFor(() =>
      expect(removeButtons().map((b) => b.getAttribute("aria-label"))).toEqual(["Remove Dune", "Remove The Matrix"]),
    );
    expect(toast.error).toHaveBeenCalledWith("Failed to save. Please try again.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("keeps the change and toasts success once the saved titles come back", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    const { rerender } = render(
      <ShowcaseEditor mediaType="movie" label="Top 4 movies" initialItems={[dune, matrix]} action={action} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Dune" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Top 4 movies updated"));

    // The page's revalidated items.
    rerender(<ShowcaseEditor mediaType="movie" label="Top 4 movies" initialItems={[matrix]} action={action} />);
    expect(removeButtons().map((b) => b.getAttribute("aria-label"))).toEqual(["Remove The Matrix"]);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
