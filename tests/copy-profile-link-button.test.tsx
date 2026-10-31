import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { CopyProfileLinkButton } from "@/components/copy-profile-link-button";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(cleanup);

describe("CopyProfileLinkButton", () => {
  it("has an accessible name", () => {
    render(<CopyProfileLinkButton username="bob" />);
    expect(screen.getByRole("button", { name: "Copy profile link" })).toBeInTheDocument();
  });

  it("copies the absolute profile URL and shows a success toast", async () => {
    writeText.mockResolvedValue(undefined);
    render(<CopyProfileLinkButton username="bob" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy profile link" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Link copied"));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/user/bob`);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows an error toast when the clipboard write fails", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<CopyProfileLinkButton username="bob" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy profile link" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy the link"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows an error toast when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<CopyProfileLinkButton username="bob" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy profile link" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't copy the link"));
  });
});
