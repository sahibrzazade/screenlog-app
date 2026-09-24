import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { changePassword } from "@/app/settings/actions";

vi.mock("@/app/settings/actions", () => ({
  changePassword: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

afterEach(cleanup);

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.mocked(changePassword).mockReset();
  });

  it("starts closed, showing only a 'Change password' button", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("opens the form when the button is clicked", () => {
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("Cancel closes the form again", () => {
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("submits current and new password to the action", async () => {
    vi.mocked(changePassword).mockResolvedValue({ success: true });
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(changePassword).mock.calls[0][1];
    expect(formData.get("currentPassword")).toBe("old-password");
    expect(formData.get("newPassword")).toBe("new-password-123");
    expect(formData.get("confirmNewPassword")).toBe("new-password-123");
  });

  it("shows the error message and stays open on failure", async () => {
    vi.mocked(changePassword).mockResolvedValue({
      error: "Current password is incorrect.",
    });
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Current password is incorrect.",
    );
    expect(screen.getByLabelText("Current password")).toBeInTheDocument();
  });

  it("disables Save and shows an inline hint when the confirmation doesn't match", () => {
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "something-else" },
    });

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("closes back to the button on success", async () => {
    vi.mocked(changePassword).mockResolvedValue({ success: true });
    render(<ChangePasswordForm />);

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-password" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });
});
