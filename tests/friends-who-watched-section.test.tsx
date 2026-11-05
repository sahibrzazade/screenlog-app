import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
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

  describe("full list dialog", () => {
    beforeAll(() => {
      // jsdom doesn't implement the modal dialog methods.
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute("open", "");
      };
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute("open");
      };
    });

    it("opens from the count, even with one friend, and lists the friend", () => {
      render(<FriendsWhoWatched friends={[friend("bob", { dropped: true })]} />);
      fireEvent.click(screen.getByRole("button", { name: "1 friend" }));

      const dialog = screen.getByRole("dialog", { name: "Friends who watched" });
      const row = within(dialog).getByRole("link", { name: "bob, rated 4 out of 5, dropped" });
      expect(row).toHaveAttribute("href", "/user/bob");
      expect(within(row).getByText("bob")).toBeInTheDocument();
      expect(within(row).getByText("Dropped")).toBeInTheDocument();
    });

    it("opens from +N and lists every friend in order, with no Follow buttons", () => {
      render(<FriendsWhoWatched friends={friends(12)} />);
      fireEvent.click(screen.getByRole("button", { name: "+5 more friends" }));

      const dialog = screen.getByRole("dialog", { name: "Friends who watched" });
      const rows = within(dialog).getAllByRole("link");
      expect(rows).toHaveLength(12);
      expect(rows[0]).toHaveAttribute("href", "/user/user0");
      expect(rows[11]).toHaveAttribute("href", "/user/user11");
      expect(within(dialog).queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
    });

    it("closes with the close button, and on Esc through the dialog's close event", () => {
      render(<FriendsWhoWatched friends={friends(2)} />);

      fireEvent.click(screen.getByRole("button", { name: "2 friends" }));
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "2 friends" }));
      const dialog = screen.getByRole("dialog");
      fireEvent(dialog, new Event("close"));
      expect(within(dialog).queryByRole("link")).not.toBeInTheDocument();
    });
  });
});
