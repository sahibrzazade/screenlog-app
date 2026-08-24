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
  it("renders each item's title linking to its href", () => {
    render(
      <ProfileSection
        title="Watchlist"
        items={items}
        total={2}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );

    expect(screen.getByText("The Matrix").closest("a")).toHaveAttribute("href", "/movie/1");
    expect(screen.getByText("Breaking Bad").closest("a")).toHaveAttribute("href", "/tv/2");
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
});
