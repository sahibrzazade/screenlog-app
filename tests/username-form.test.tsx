import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { UsernameForm } from "@/components/username-form";
import { updateUsername } from "@/lib/actions/username";

const pushMock = vi.fn();

vi.mock("@/lib/actions/username", () => ({
  updateUsername: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

afterEach(cleanup);

describe("UsernameForm", () => {
  beforeEach(() => {
    vi.mocked(updateUsername).mockReset();
    pushMock.mockReset();
  });

  it("renders the username field pre-filled with the default value", () => {
    render(<UsernameForm variant="settings" defaultUsername="example" />);
    expect(screen.getByLabelText("Username")).toHaveValue("example");
  });

  it("submits the entered username to the action", async () => {
    vi.mocked(updateUsername).mockResolvedValue({ success: true });
    render(<UsernameForm variant="settings" />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateUsername).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(updateUsername).mock.calls[0][1];
    expect(formData.get("username")).toBe("example");
  });

  it("shows the error message returned by the action", async () => {
    vi.mocked(updateUsername).mockResolvedValue({
      error: "That username is already taken.",
    });
    render(<UsernameForm variant="settings" />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That username is already taken.",
    );
  });

  it("does not navigate away on success in the settings variant", async () => {
    vi.mocked(updateUsername).mockResolvedValue({ success: true });
    render(<UsernameForm variant="settings" />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateUsername).toHaveBeenCalledTimes(1));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects home on success in the choose variant", async () => {
    vi.mocked(updateUsername).mockResolvedValue({ success: true });
    render(<UsernameForm variant="choose" />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });
});
