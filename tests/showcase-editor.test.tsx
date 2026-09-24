import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ShowcaseEditor } from "@/components/showcase-editor";

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
