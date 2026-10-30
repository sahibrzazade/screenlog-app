import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { FollowButton } from "@/components/follow-button";
import { toggleFollow } from "@/app/user/[username]/actions";

vi.mock("@/app/user/[username]/actions", () => ({
  toggleFollow: vi.fn(),
}));

afterEach(cleanup);

const TARGET_ID = "3f2b8c1e-4d5a-4b6c-9e7f-1a2b3c4d5e6f";

describe("FollowButton", () => {
  beforeEach(() => {
    vi.mocked(toggleFollow).mockReset();
  });

  it("shows 'Follow' when not following", () => {
    render(<FollowButton targetUserId={TARGET_ID} initialFollowing={false} />);
    expect(screen.getByRole("button", { name: "Follow" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows 'Following' when already following", () => {
    render(<FollowButton targetUserId={TARGET_ID} initialFollowing />);
    expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("submits the target id and current state to the action", async () => {
    vi.mocked(toggleFollow).mockResolvedValue({ following: true });
    render(<FollowButton targetUserId={TARGET_ID} initialFollowing={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() => expect(toggleFollow).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(toggleFollow).mock.calls[0][1];
    expect(formData.get("targetUserId")).toBe(TARGET_ID);
    expect(formData.get("following")).toBe("false");
  });

  it("flips to 'Following' after the action resolves", async () => {
    vi.mocked(toggleFollow).mockResolvedValue({ following: true });
    render(<FollowButton targetUserId={TARGET_ID} initialFollowing={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(await screen.findByRole("button", { name: "Following" })).toBeInTheDocument();
  });

  it("shows the error message returned by the action", async () => {
    vi.mocked(toggleFollow).mockResolvedValue({
      following: false,
      error: "Failed to follow. Please try again.",
    });
    render(<FollowButton targetUserId={TARGET_ID} initialFollowing={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Follow" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to follow. Please try again.",
    );
  });
});
