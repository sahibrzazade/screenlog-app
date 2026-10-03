import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { login, signup, loginWithGoogle } from "@/app/(auth)/actions";

vi.mock("@/app/(auth)/actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  loginWithGoogle: vi.fn(),
}));

afterEach(cleanup);

describe("LoginForm", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("submits the entered credentials to the login action", async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(login).mock.calls[0][1];
    expect(formData.get("email")).toBe("user@example.com");
    expect(formData.get("password")).toBe("secret123");
  });

  it("shows the error message returned by the login action", async () => {
    vi.mocked(login).mockResolvedValue({ error: "Invalid login credentials" });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid login credentials",
    );
  });

  it("renders a Continue with Google button", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(loginWithGoogle).toBeDefined();
  });
});

describe("SignupForm", () => {
  beforeEach(() => {
    vi.mocked(signup).mockReset();
  });

  it("renders username, email, and password fields", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("submits the entered credentials to the signup action", async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(signup).mock.calls[0][1];
    expect(formData.get("username")).toBe("example");
    expect(formData.get("email")).toBe("new@example.com");
    expect(formData.get("password")).toBe("secret123");
    expect(formData.get("confirmPassword")).toBe("secret123");
  });

  it("shows the error message returned by the signup action", async () => {
    vi.mocked(signup).mockResolvedValue({ error: "User already registered" });
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "User already registered",
    );
  });

  it("disables Sign up and shows an inline hint when the passwords don't match", () => {
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "something-else" },
    });

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeDisabled();
    expect(signup).not.toHaveBeenCalled();
  });
});
