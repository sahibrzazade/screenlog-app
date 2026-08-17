import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SearchPage from "@/app/search/page";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} alt={props.alt ?? ""} />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockSearchResponses = (movieResults: unknown[], tvResults: unknown[]) => {
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const isMovie = url.includes("type=movie");
    const results = isMovie ? movieResults : tvResults;
    return new Response(
      JSON.stringify({ page: 1, results, total_pages: 1, total_results: results.length }),
      { status: 200 },
    );
  });
};

describe("SearchPage", () => {
  it("renders a search input", () => {
    render(<SearchPage />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("shows combined movie and TV results after typing a query", async () => {
    mockSearchResponses(
      [{ id: 603, title: "The Matrix", poster_path: "/matrix.jpg", release_date: "1999-03-30" }],
      [{ id: 1396, name: "Breaking Bad", poster_path: "/bb.jpg", first_air_date: "2008-01-20" }],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "matrix" } });

    expect(await screen.findByText("The Matrix")).toBeInTheDocument();
    expect(await screen.findByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText(/1999/)).toBeInTheDocument();
    expect(screen.getByText(/2008/)).toBeInTheDocument();
  });

  it("links each result to its detail page", async () => {
    mockSearchResponses(
      [{ id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" }],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "matrix" } });

    const link = await screen.findByRole("link", { name: /the matrix/i });
    expect(link).toHaveAttribute("href", "/movie/603");
  });

  it("clears results when the query is emptied", async () => {
    mockSearchResponses(
      [{ id: 603, title: "The Matrix", poster_path: null, release_date: "1999-03-30" }],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "matrix" } });
    await screen.findByText("The Matrix");

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "" } });
    await waitFor(() => expect(screen.queryByText("The Matrix")).not.toBeInTheDocument());
  });

  it("shows a no-results message when the search returns nothing", async () => {
    mockSearchResponses([], []);

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "asdkjaslkdj" } });

    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
  });

  it("shows a prompt before any search has been made", () => {
    render(<SearchPage />);
    expect(screen.getByText(/search for a movie or tv show/i)).toBeInTheDocument();
  });
});
