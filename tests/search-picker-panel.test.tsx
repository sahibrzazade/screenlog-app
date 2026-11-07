import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SearchPickerPanel } from "@/components/search-picker-panel";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockSearch = () =>
  vi.spyOn(global, "fetch").mockImplementation(async (input) => {
    const results = String(input).includes("type=tv")
      ? [{ id: 2, name: "Dark", poster_path: null, first_air_date: "2017-12-01" }]
      : [{ id: 1, title: "Dark City", poster_path: null, release_date: "1998-02-27" }];
    return new Response(JSON.stringify({ page: 1, results, total_pages: 1, total_results: 1 }), { status: 200 });
  });

const Switchable = ({ onSelect = () => {} }: { onSelect?: (item: unknown) => void }) => {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  return <SearchPickerPanel mediaType={mediaType} onMediaTypeChange={setMediaType} onSelect={onSelect} onClose={() => {}} />;
};

describe("SearchPickerPanel", () => {
  it("has no toggle when the media type is fixed", () => {
    render(<SearchPickerPanel mediaType="movie" onSelect={() => {}} onClose={() => {}} />);

    expect(screen.getByText("Search movies")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Search in" })).not.toBeInTheDocument();
  });

  it("marks the selected media type and reports a change", () => {
    const onMediaTypeChange = vi.fn();
    render(<SearchPickerPanel mediaType="movie" onMediaTypeChange={onMediaTypeChange} onSelect={() => {}} onClose={() => {}} />);

    expect(screen.getByRole("button", { name: "Movies" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Shows" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Shows" }));

    expect(onMediaTypeChange).toHaveBeenCalledWith("tv");
  });

  it("keeps the query when switching and searches the new type", async () => {
    const fetchSpy = mockSearch();
    render(<Switchable />);

    fireEvent.change(screen.getByPlaceholderText("Search movies..."), { target: { value: "dark" } });
    expect(await screen.findByText("Dark City")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Shows" }));

    expect(screen.getByPlaceholderText("Search TV shows...")).toHaveValue("dark");
    // The previous type's results are gone at once, before the new search returns.
    expect(screen.queryByText("Dark City")).not.toBeInTheDocument();
    expect(await screen.findByText("Dark")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenLastCalledWith(expect.stringContaining("type=tv"), expect.anything());
  });

  it("picks a title with the selected media type", async () => {
    mockSearch();
    const onSelect = vi.fn();
    render(<Switchable onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Shows" }));
    fireEvent.change(screen.getByPlaceholderText("Search TV shows..."), { target: { value: "dark" } });
    fireEvent.click(await screen.findByRole("button", { name: /Dark/ }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2, mediaType: "tv" }));
  });
});
