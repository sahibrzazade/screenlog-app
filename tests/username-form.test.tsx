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

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: mockFrom }),
}));

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

// The settings variant starts disabled behind an "Edit" button.
const startEditing = () => {
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
};

describe("UsernameForm", () => {
  beforeEach(() => {
    vi.mocked(updateUsername).mockReset();
    pushMock.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockClear();
    mockMaybeSingle.mockReset().mockResolvedValue({ data: null });
  });

  it("renders the username field pre-filled and disabled, with an Edit button", () => {
    render(<UsernameForm variant="settings" defaultUsername="example" />);
    expect(screen.getByLabelText("Username")).toHaveValue("example");
    expect(screen.getByLabelText("Username")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("enables the field and shows Save/Cancel after clicking Edit", () => {
    render(<UsernameForm variant="settings" defaultUsername="example" />);

    startEditing();

    expect(screen.getByLabelText("Username")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Cancel reverts the value and disables the field again", () => {
    render(<UsernameForm variant="settings" defaultUsername="example" />);

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "something-else" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Username")).toHaveValue("example");
    expect(screen.getByLabelText("Username")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("the choose variant has no Edit button and is editable immediately", () => {
    render(<UsernameForm variant="choose" />);

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeEnabled();
  });

  it("submits the entered username to the action", async () => {
    vi.mocked(updateUsername).mockResolvedValue({ success: true });
    render(<UsernameForm variant="settings" />);

    startEditing();
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

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That username is already taken.",
    );
  });

  it("does not navigate away on success in the settings variant, and disables the field again", async () => {
    vi.mocked(updateUsername).mockResolvedValue({ success: true });
    render(<UsernameForm variant="settings" />);

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateUsername).toHaveBeenCalledTimes(1));
    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument(),
    );
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

  it("shows an available message once the debounced check finds no match", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    render(<UsernameForm variant="settings" defaultUsername="taken_one" />);

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "brand_new_name" },
    });

    expect(await screen.findByText("Username is available")).toBeInTheDocument();
    expect(mockEq).toHaveBeenCalledWith("username", "brand_new_name");
  });

  it("shows a taken message once the debounced check finds a match", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "some-id" } });
    render(<UsernameForm variant="settings" defaultUsername="taken_one" />);

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "someone_else" },
    });

    expect(await screen.findByText("Username is already taken")).toBeInTheDocument();
  });

  it("shows a format hint for invalid input without querying availability", async () => {
    render(<UsernameForm variant="settings" defaultUsername="taken_one" />);

    startEditing();
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "a" },
    });

    expect(
      await screen.findByText("3-20 characters, letters/numbers/underscores only"),
    ).toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("shows no availability hint when the value matches the current username", () => {
    render(<UsernameForm variant="settings" defaultUsername="taken_one" />);

    expect(screen.queryByText(/available|already taken|characters/)).not.toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not run the availability check before Edit is clicked", () => {
    render(<UsernameForm variant="settings" defaultUsername="taken_one" />);

    // Field is disabled, so this simulates a stray change event rather than
    // real user input — the effect should still not fire while not editing.
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "brand_new_name" },
    });

    expect(mockFrom).not.toHaveBeenCalled();
  });
});
