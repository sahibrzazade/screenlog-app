import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { FriendsWhoWatched } from "@/components/detail/friends-who-watched";
import type { FriendWhoWatched } from "@/lib/friends-who-watched";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

afterEach(cleanup);

const friend = (username: string, extra: Partial<FriendWhoWatched> = {}): FriendWhoWatched => ({
  userId: username,
  username,
  avatarUrl: null,
  rating: 4,
  dropped: false,
  ...extra,
});

const friends = (count: number) => Array.from({ length: count }, (_, index) => friend(`user${index}`));

describe("FriendsWhoWatched", () => {
  it("renders nothing without friends", () => {
    const { container } = render(<FriendsWhoWatched friends={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links a tile to the profile and shows the rating", () => {
    render(<FriendsWhoWatched friends={[friend("bob", { rating: 4.5 })]} />);
    const tile = screen.getByRole("link", { name: "bob, rated 4.5 out of 5" });
    expect(tile).toHaveAttribute("href", "/user/bob");
    expect(within(tile).getByRole("img", { name: "4.5 out of 5 stars" })).toBeInTheDocument();
    expect(screen.getByText("1 friend")).toBeInTheDocument();
  });

  it("shows Watched instead of empty stars for an unrated log", () => {
    render(<FriendsWhoWatched friends={[friend("bob", { rating: null })]} />);
    const tile = screen.getByRole("link", { name: "bob, watched" });
    expect(within(tile).getByText("Watched")).toBeInTheDocument();
    expect(within(tile).queryByRole("img", { name: /stars/ })).not.toBeInTheDocument();
  });

  it("marks a dropped show", () => {
    render(<FriendsWhoWatched friends={[friend("bob", { dropped: true })]} />);
    const tile = screen.getByRole("link", { name: "bob, rated 4 out of 5, dropped" });
    expect(within(tile).getByText("Dropped")).toBeInTheDocument();
  });

  it("shows all 8 tiles and no overflow at exactly 8 friends", () => {
    render(<FriendsWhoWatched friends={friends(8)} />);
    expect(screen.getAllByRole("link")).toHaveLength(8);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("shows 7 tiles and +N past 8 friends", () => {
    render(<FriendsWhoWatched friends={friends(12)} />);
    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("12 friends")).toBeInTheDocument();
  });
});
