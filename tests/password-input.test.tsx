import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PasswordInput } from "@/components/password-input";

afterEach(cleanup);

describe("PasswordInput", () => {
  it("masks the value by default", () => {
    render(<PasswordInput id="password" name="password" aria-label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("reveals the value as plain text when the toggle is clicked", () => {
    render(<PasswordInput id="password" name="password" aria-label="Password" />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("masks the value again when the toggle is clicked a second time", () => {
    render(<PasswordInput id="password" name="password" aria-label="Password" />);

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("does not submit the form when the toggle is clicked", () => {
    render(
      <form>
        <PasswordInput id="password" name="password" aria-label="Password" />
      </form>,
    );

    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
      "type",
      "button",
    );
  });
});
