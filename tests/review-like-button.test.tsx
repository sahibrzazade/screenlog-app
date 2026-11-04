import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { ReviewLikeButton } from "@/components/review-like-button";
import { toggleReviewLike } from "@/app/review-like-actions";

vi.mock("@/app/review-like-actions", () => ({ toggleReviewLike: vi.fn() }));
vi.mock("@/app/user/[username]/actions", () => ({ toggleFollow: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

afterEach(cleanup);

const LOG_ID = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

const renderButton = (initialLiked: boolean, initialCount: number) =>
  render(
    <ReviewLikeButton
      logKind="movie"
      logId={LOG_ID}
      initialLiked={initialLiked}
      initialCount={initialCount}
      reviewerName="alice"
      viewerId="viewer"
    />,
  );

const heart = () => screen.getByRole("button", { name: "Like alice's review" });
const countButton = (name: string) => screen.getByRole("button", { name });

describe("ReviewLikeButton", () => {
  beforeEach(() => {
    vi.mocked(toggleReviewLike).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("shows the pressed state and the count with a spoken unit", () => {
    renderButton(true, 3);
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    expect(countButton("3 likes")).toHaveTextContent("3");
  });

  it("shows no count at zero", () => {
    renderButton(false, 0);
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("submits the log and the current state, then shows the new count", async () => {
    vi.mocked(toggleReviewLike).mockResolvedValue({ liked: true });
    renderButton(false, 1);

    fireEvent.click(heart());

    await waitFor(() => expect(toggleReviewLike).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(toggleReviewLike).mock.calls[0][1];
    expect(formData.get("logKind")).toBe("movie");
    expect(formData.get("logId")).toBe(LOG_ID);
    expect(formData.get("liked")).toBe("false");
    await waitFor(() => expect(heart()).toHaveAttribute("aria-pressed", "true"));
    expect(countButton("2 likes")).toBeInTheDocument();
  });

  it("flips immediately, before the action resolves", async () => {
    let resolve: (value: { liked: boolean }) => void = () => {};
    vi.mocked(toggleReviewLike).mockImplementation(() => new Promise((r) => (resolve = r)));
    renderButton(true, 1);

    fireEvent.click(heart());

    await waitFor(() => expect(heart()).toHaveAttribute("aria-pressed", "false"));
    expect(screen.queryByRole("button", { name: "1 like" })).not.toBeInTheDocument();
    resolve({ liked: false });
  });

  it("rolls back and toasts the error when the action fails", async () => {
    vi.mocked(toggleReviewLike).mockResolvedValue({ liked: false, error: "Failed to like. Please try again." });
    renderButton(false, 4);

    fireEvent.click(heart());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to like. Please try again."));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(countButton("4 likes")).toBeInTheDocument();
  });
});
