import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Trophy } from "lucide-react";
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

  it("shows an Edit link to editHref instead of See all when editHref is set", () => {
    render(
      <ProfileSection
        title="Top 4 movies"
        items={items}
        total={2}
        seeAllHref="/user/alice"
        emptyMessage="No favourites yet."
        capacity={4}
        editHref="/settings"
      />,
    );

    expect(screen.getByText("Edit")).toHaveAttribute("href", "/settings");
    expect(screen.queryByText("See all")).not.toBeInTheDocument();
  });

  it("renders a decorative icon before the title, keeping the heading's name to the title", () => {
    const { container } = render(
      <ProfileSection
        title="Top 4 movies"
        icon={Trophy}
        items={[]}
        total={0}
        seeAllHref="/settings"
        emptyMessage="No favourites yet."
      />,
    );

    const heading = screen.getByRole("heading", { name: "Top 4 movies" });
    const icon = heading.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("h2 svg")).toHaveLength(1);
  });

  it("renders no icon when none is given", () => {
    render(
      <ProfileSection
        title="Watchlist"
        items={[]}
        total={0}
        seeAllHref="/watchlist"
        emptyMessage="Nothing here yet."
      />,
    );

    expect(screen.getByRole("heading", { name: "Watchlist" }).querySelector("svg")).toBeNull();
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
