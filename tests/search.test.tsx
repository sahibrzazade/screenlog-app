import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import SearchPage from "@/app/search/page";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => "/search",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
const mockEq = vi.fn().mockResolvedValue({ data: [] });
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/search");
  mockGetUser.mockResolvedValue({ data: { user: null } });
  mockEq.mockResolvedValue({ data: [] });
});

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
      JSON.stringify({
        page: 1,
        results,
        total_pages: 1,
        total_results: results.length,
      }),
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
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: "/matrix.jpg",
          release_date: "1999-03-30",
        },
      ],
      [
        {
          id: 1396,
          name: "Breaking Bad",
          poster_path: "/bb.jpg",
          first_air_date: "2008-01-20",
        },
      ],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });

    expect(await screen.findByText("The Matrix")).toBeInTheDocument();
    expect(await screen.findByText("Breaking Bad")).toBeInTheDocument();
    expect(screen.getByText(/1999/)).toBeInTheDocument();
    expect(screen.getByText(/2008/)).toBeInTheDocument();
  });

  it("links each result to its detail page", async () => {
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });

    const link = await screen.findByRole("link", { name: /the matrix/i });
    expect(link).toHaveAttribute("href", "/movie/603");
  });

  it("clears results when the query is emptied", async () => {
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });
    await screen.findByText("The Matrix");

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "" },
    });
    await waitFor(() =>
      expect(screen.queryByText("The Matrix")).not.toBeInTheDocument(),
    );
  });

  it("shows a no-results message when the search returns nothing", async () => {
    mockSearchResponses([], []);

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "asdkjaslkdj" },
    });

    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
  });

  it("shows a prompt before any search has been made", () => {
    render(<SearchPage />);
    expect(
      screen.getByText(/search for a movie or tv show/i),
    ).toBeInTheDocument();
  });

  it("syncs the query to the URL after searching", async () => {
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });
    await screen.findByText("The Matrix");

    expect(replaceMock).toHaveBeenCalledWith("/search?q=matrix", {
      scroll: false,
    });
  });

  it("clears the query param from the URL when the query is emptied", async () => {
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });
    await screen.findByText("The Matrix");
    window.history.replaceState(null, "", "/search?q=matrix");

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "" },
    });
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/search", { scroll: false }),
    );
  });

  it("initializes the search input from a `q` URL param", () => {
    window.history.replaceState(null, "", "/search?q=matrix");

    render(<SearchPage />);

    expect(screen.getByLabelText("Search")).toHaveValue("matrix");
  });

  it("orders combined results by popularity, most popular first", async () => {
    mockSearchResponses(
      [
        {
          id: 1,
          title: "Obscure Movie",
          poster_path: null,
          release_date: "2001-01-01",
          popularity: 5,
        },
        {
          id: 2,
          title: "Blockbuster Movie",
          poster_path: null,
          release_date: "2002-01-01",
          popularity: 500,
        },
      ],
      [
        {
          id: 3,
          name: "Mid Show",
          poster_path: null,
          first_air_date: "2003-01-01",
          popularity: 100,
        },
      ],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "batman" },
    });
    await screen.findByText("Blockbuster Movie");

    const links = screen.getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual([
      expect.stringContaining("Blockbuster Movie"),
      expect.stringContaining("Mid Show"),
      expect.stringContaining("Obscure Movie"),
    ]);
  });

  it("does not show a watchlist button for a logged-out visitor", async () => {
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });

    await screen.findByText("The Matrix");
    expect(
      screen.queryByRole("button", { name: /watchlist/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a watchlist button reflecting saved state for a logged-in user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockEq.mockResolvedValue({ data: [{ tmdb_id: 603, media_type: "movie" }] });
    mockSearchResponses(
      [
        {
          id: 603,
          title: "The Matrix",
          poster_path: null,
          release_date: "1999-03-30",
        },
        {
          id: 604,
          title: "The Matrix Reloaded",
          poster_path: null,
          release_date: "2003-05-15",
        },
      ],
      [],
    );

    render(<SearchPage />);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "matrix" },
    });

    await screen.findByText("The Matrix");
    expect(
      await screen.findByRole("button", { name: "In watchlist" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to watchlist" }),
    ).toBeInTheDocument();
  });
});
