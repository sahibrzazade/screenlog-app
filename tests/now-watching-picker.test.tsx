import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { NowWatchingPicker } from "@/components/now-watching-picker";
import { updateNowWatching } from "@/app/settings/actions";
import type { MediaCardItem } from "@/components/media-card";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/app/settings/actions", () => ({ updateNowWatching: vi.fn() }));

const severance: MediaCardItem = { id: 95396, mediaType: "tv", title: "Severance", year: "2022", posterPath: null };

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(updateNowWatching).mockReset();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe("NowWatchingPicker", () => {
  it("puts the saved show back and toasts the error when clearing it fails", async () => {
    let fail: (state: { error: string }) => void = () => {};
    vi.mocked(updateNowWatching).mockImplementation(() => new Promise((resolve) => (fail = resolve)));

    render(<NowWatchingPicker initialItem={severance} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Severance" }));

    // Shown cleared while saving…
    expect(await screen.findByRole("button", { name: "Add a TV show" })).toBeInTheDocument();
    const sent = vi.mocked(updateNowWatching).mock.calls[0][1];
    expect(sent.get("nowWatchingShowId")).toBe("");

    fail({ error: "Failed to save. Please try again." });

    // …and back once the save fails.
    expect(await screen.findByRole("button", { name: "Remove Severance" })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Failed to save. Please try again.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("toasts success and keeps the change once the saved show comes back", async () => {
    vi.mocked(updateNowWatching).mockResolvedValue({ success: true });

    const { rerender } = render(<NowWatchingPicker initialItem={severance} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Severance" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Currently watching updated"));

    // The page's revalidated value.
    rerender(<NowWatchingPicker initialItem={null} />);
    expect(screen.getByRole("button", { name: "Add a TV show" })).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
