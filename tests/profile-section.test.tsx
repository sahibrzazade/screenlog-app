import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProfileSection, type ProfileSectionItem } from "@/components/profile-section";

afterEach(() => {
  cleanup();
});

const items: ProfileSectionItem[] = [
  { id: 1, title: "The Matrix", posterPath: "/matrix.jpg", href: "/movie/1" },
  { id: 2, title: "Breaking Bad", posterPath: null, href: "/tv/2" },
];

describe("ProfileSection", () => {
  it("renders each item as an accessibly-named link to its href", () => {
    render(
      <ProfileSection
        title="Watchlist"
        items={items}
        total={2}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );

    expect(screen.getByRole("link", { name: "The Matrix" })).toHaveAttribute(
      "href",
      "/movie/1",
    );
    expect(screen.getByRole("link", { name: "Breaking Bad" })).toHaveAttribute(
      "href",
      "/tv/2",
    );
  });

  it("shows a See all link only when total exceeds the shown items", () => {
    const { rerender } = render(
      <ProfileSection
        title="Watchlist"
        items={items}
        total={2}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );
    expect(screen.queryByText("See all")).not.toBeInTheDocument();

    rerender(
      <ProfileSection
        title="Watchlist"
        items={items}
        total={9}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );
    expect(screen.getByText("See all")).toHaveAttribute("href", "/watchlist");
  });

  it("shows the empty message instead of a grid when there are no items", () => {
    render(
      <ProfileSection
        title="Watchlist"
        items={[]}
        total={0}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByText("See all")).not.toBeInTheDocument();
  });

  it("fills remaining slots with placeholders when capacity is set", () => {
    const { container } = render(
      <ProfileSection
        title="Top 4 movies"
        items={items}
        total={2}
        seeAllHref="/settings"
        emptyMessage="No favourites yet."
        capacity={4}
      />,
    );

    expect(screen.getByRole("link", { name: "The Matrix" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Breaking Bad" })).toBeInTheDocument();
    expect(screen.queryByText("No favourites yet.")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it("renders all placeholders instead of the empty message when capacity is set and there are no items", () => {
    const { container } = render(
      <ProfileSection
        title="Top 4 movies"
        items={[]}
        total={0}
        seeAllHref="/settings"
        emptyMessage="No favourites yet."
        capacity={4}
      />,
    );

    expect(screen.queryByText("No favourites yet.")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
  });
});
