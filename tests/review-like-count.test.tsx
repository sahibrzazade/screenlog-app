import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { ReviewLikeCount } from "@/components/review-like-count";
import { getReviewLikers } from "@/lib/review-likes";

vi.mock("@/lib/review-likes", () => ({ getReviewLikers: vi.fn() }));
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

const LOG_ID = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

const renderCount = (count: number, viewerId: string | null = "viewer") =>
  render(<ReviewLikeCount count={count} logKind="show" logId={LOG_ID} viewerId={viewerId} />);

describe("ReviewLikeCount", () => {
  beforeEach(() => {
    vi.mocked(getReviewLikers).mockReset();
  });

  it("renders nothing at zero", () => {
    renderCount(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens 'Liked by' with the likers of this review", async () => {
    vi.mocked(getReviewLikers).mockResolvedValue([
      { id: "a", username: "alice", avatarUrl: null, viewerFollows: true },
      { id: "viewer", username: "me", avatarUrl: null, viewerFollows: false },
    ]);
    renderCount(2);

    fireEvent.click(screen.getByRole("button", { name: "2 likes" }));

    const alice = await screen.findByRole("link", { name: "alice" });
    expect(alice).toHaveAttribute("href", "/user/alice");
    expect(screen.getByRole("heading", { name: "Liked by" })).toBeInTheDocument();
    expect(getReviewLikers).toHaveBeenCalledWith(expect.anything(), "show", LOG_ID, "viewer");
    // Follow button on others' rows, none on the viewer's own.
    expect(within(alice.closest("li")!).getByRole("button", { name: "Following" })).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "me" }).closest("li")!).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows no Follow buttons to guests", async () => {
    vi.mocked(getReviewLikers).mockResolvedValue([{ id: "a", username: "alice", avatarUrl: null, viewerFollows: false }]);
    renderCount(1, null);

    fireEvent.click(screen.getByRole("button", { name: "1 like" }));

    const row = (await screen.findByRole("link", { name: "alice" })).closest("li")!;
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an error when the likers fail to load", async () => {
    vi.mocked(getReviewLikers).mockRejectedValue(new Error("network"));
    renderCount(1);

    fireEvent.click(screen.getByRole("button", { name: "1 like" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load this list.");
  });

  it("refetches when reopened instead of showing the old list", async () => {
    vi.mocked(getReviewLikers).mockResolvedValue([{ id: "a", username: "alice", avatarUrl: null, viewerFollows: false }]);
    renderCount(1);

    fireEvent.click(screen.getByRole("button", { name: "1 like" }));
    await screen.findByRole("link", { name: "alice" });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "1 like" }));

    expect(await screen.findByRole("link", { name: "alice" })).toBeInTheDocument();
    expect(getReviewLikers).toHaveBeenCalledTimes(2);
  });
});
