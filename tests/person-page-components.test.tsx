import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Filmography, KnownForRow, watchedShare } from "@/components/person/person-credits";
import { PersonBio } from "@/components/person/person-bio";
import type { PersonCreditItem } from "@/lib/tmdb/person-credits";

vi.mock("@/app/watchlist/actions", () => ({ toggleWatchlist: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const credits: PersonCreditItem[] = [
  { id: 550, mediaType: "movie", title: "Fight Club", year: "1999", posterPath: null, character: "Tyler Durden" },
  { id: 1396, mediaType: "tv", title: "Breaking Bad", year: "2008", posterPath: null, character: "" },
  { id: 550, mediaType: "tv", title: "Same Id Show", year: "2001", posterPath: null, character: "Host" },
];

describe("Filmography", () => {
  it("shows the watched share and marks watched titles for a signed-in viewer", () => {
    render(<Filmography credits={credits} watchedKeys={new Set(["movie-550", "tv-1396"])} />);

    expect(screen.getByRole("heading", { name: "Filmography 3" })).toBeInTheDocument();
    expect(screen.getByText(/watched ·/)).toHaveTextContent("2 / 3 watched · 67%");
    const progress = screen.getByRole("progressbar", { name: "Watched 2 of 3 titles" });
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(screen.getAllByText("Watched")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Fight Club/ })).toHaveAccessibleName(expect.stringContaining("Watched"));
    expect(screen.getByRole("link", { name: /Same Id Show/ })).not.toHaveAccessibleName(
      expect.stringContaining("Watched"),
    );
  });

  it("shows only the title count, no progress or marks, for guests", () => {
    render(<Filmography credits={credits} watchedKeys={null} />);

    expect(screen.getByRole("heading", { name: "Filmography 3" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/watched ·/)).not.toBeInTheDocument();
    expect(screen.queryByText("Watched")).not.toBeInTheDocument();
  });

  it("still shows the counts and an empty bar when nothing is watched", () => {
    render(<Filmography credits={credits} watchedKeys={new Set()} />);
    expect(screen.getByText(/watched ·/)).toHaveTextContent("0 / 3 watched · 0%");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows each character under its card and links cards to their titles", () => {
    render(<Filmography credits={credits} watchedKeys={null} />);

    expect(screen.getByText("Tyler Durden")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fight Club/ })).toHaveAttribute("href", "/movie/550");
    expect(screen.getByRole("link", { name: /Breaking Bad/ })).toHaveAttribute("href", "/tv/1396");
  });

  it("says so when there are no acting credits", () => {
    render(<Filmography credits={[]} watchedKeys={new Set()} />);
    expect(screen.getByText("No acting credits yet.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("watchedShare", () => {
  it("rounds to a whole percent", () => {
    expect(watchedShare(6, 138)).toEqual({ label: "4%", barWidth: (6 / 138) * 100 });
    expect(watchedShare(3, 3)).toEqual({ label: "100%", barWidth: 100 });
  });

  it("says <1% and keeps a 1% bar for a tiny share", () => {
    expect(watchedShare(1, 150)).toEqual({ label: "<1%", barWidth: 1 });
  });

  it("is 0% with an empty bar when nothing is watched", () => {
    expect(watchedShare(0, 138)).toEqual({ label: "0%", barWidth: 0 });
    expect(watchedShare(0, 0)).toEqual({ label: "0%", barWidth: 0 });
  });
});

describe("KnownForRow", () => {
  it("renders nothing when empty", () => {
    const { container } = render(<KnownForRow credits={[]} watchedKeys={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a heading and the cards", () => {
    render(<KnownForRow credits={credits} watchedKeys={new Set(["movie-550"])} />);
    expect(screen.getByRole("heading", { name: "Known for" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getAllByText("Watched")).toHaveLength(1);
  });
});

describe("PersonBio", () => {
  /** jsdom has no layout: fake a ResizeObserver and the clamped text's heights. */
  const fakeOverflow = (overflows: boolean) => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private callback: () => void) {}
        observe() {
          this.callback();
        }
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(overflows ? 200 : 96);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(96);
  };

  it("renders nothing for an empty biography", () => {
    const { container } = render(<PersonBio biography="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("has no toggle when the text fits", () => {
    fakeOverflow(false);
    render(<PersonBio biography="Short bio." />);
    expect(screen.getByText("Short bio.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("expands and collapses a long biography", () => {
    fakeOverflow(true);
    render(<PersonBio biography="A very long bio." />);

    const toggle = screen.getByRole("button", { name: "Read more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("A very long bio.")).toHaveClass("line-clamp-4");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("A very long bio.")).not.toHaveClass("line-clamp-4");
  });
});
