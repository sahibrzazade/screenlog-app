import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { ProfileStats } from "@/components/profile-stats";
import { getFollowList } from "@/lib/follows";

vi.mock("@/lib/follows", () => ({ getFollowList: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("@/app/user/[username]/actions", () => ({ toggleFollow: vi.fn() }));

afterEach(cleanup);

// jsdom doesn't implement the modal dialog API.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const VIEWER_ID = "22222222-2222-4222-8222-222222222222";

const renderStats = (
  overrides: Partial<{ followers: number; following: number; viewerId: string | null }> = {},
) =>
  render(
    <ProfileStats
      profileId={PROFILE_ID}
      films={12}
      shows={1}
      followers={overrides.followers ?? 0}
      following={overrides.following ?? 0}
      viewerId={overrides.viewerId ?? null}
    />,
  );

describe("ProfileStats", () => {
  beforeEach(() => {
    vi.mocked(getFollowList).mockReset();
  });

  it("shows all four stats with singular/plural labels", () => {
    renderStats({ followers: 1, following: 3 });
    expect(screen.getByText("Films")).toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Follower" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 Following" })).toBeInTheDocument();
  });

  it("only makes the follow counts clickable", () => {
    renderStats();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("opens the followers list and fetches it for this profile", async () => {
    vi.mocked(getFollowList).mockResolvedValue([
      { id: "a", username: "alice", avatarUrl: null, viewerFollows: false },
    ]);
    renderStats({ followers: 1 });

    fireEvent.click(screen.getByRole("button", { name: "1 Follower" }));

    expect(await screen.findByRole("link", { name: "alice" })).toHaveAttribute(
      "href",
      "/user/alice",
    );
    expect(screen.getByRole("heading", { name: "Followers" })).toBeInTheDocument();
    expect(getFollowList).toHaveBeenCalledWith(expect.anything(), PROFILE_ID, "followers", null);
  });

  it("shows no Follow buttons in rows for guests", async () => {
    vi.mocked(getFollowList).mockResolvedValue([
      { id: "a", username: "alice", avatarUrl: null, viewerFollows: false },
    ]);
    renderStats({ followers: 1 });

    fireEvent.click(screen.getByRole("button", { name: "1 Follower" }));
    const row = (await screen.findByRole("link", { name: "alice" })).closest("li")!;

    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows Follow buttons for a signed-in viewer, except on their own row", async () => {
    vi.mocked(getFollowList).mockResolvedValue([
      { id: "a", username: "alice", avatarUrl: null, viewerFollows: true },
      { id: VIEWER_ID, username: "me", avatarUrl: null, viewerFollows: false },
    ]);
    renderStats({ followers: 2, viewerId: VIEWER_ID });

    fireEvent.click(screen.getByRole("button", { name: "2 Followers" }));
    const aliceRow = (await screen.findByRole("link", { name: "alice" })).closest("li")!;
    const ownRow = screen.getByRole("link", { name: "me" }).closest("li")!;

    expect(within(aliceRow).getByRole("button", { name: "Following" })).toBeInTheDocument();
    expect(within(ownRow).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an empty state when the list is empty", async () => {
    vi.mocked(getFollowList).mockResolvedValue([]);
    renderStats();

    fireEvent.click(screen.getByRole("button", { name: "0 Following" }));

    expect(await screen.findByText("Not following anyone yet.")).toBeInTheDocument();
  });

  it("shows an error when the list fails to load", async () => {
    vi.mocked(getFollowList).mockRejectedValue(new Error("network"));
    renderStats({ followers: 1 });

    fireEvent.click(screen.getByRole("button", { name: "1 Follower" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this list.");
  });
});
