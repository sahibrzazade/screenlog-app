import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";
import SignupPage from "@/app/(auth)/signup/page";
import { login, signup, loginWithGoogle } from "@/app/(auth)/actions";

vi.mock("@/app/(auth)/actions", () => ({
  login: vi.fn(),
  signup: vi.fn(),
  loginWithGoogle: vi.fn(),
}));

afterEach(cleanup);

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("submits the entered credentials to the login action", async () => {
    vi.mocked(login).mockResolvedValue(undefined);
    render(<LoginPage />);

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
    render(<LoginPage />);

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
    render(<LoginPage />);
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
    expect(loginWithGoogle).toBeDefined();
  });
});

describe("SignupPage", () => {
  beforeEach(() => {
    vi.mocked(signup).mockReset();
  });

  it("renders username, email, and password fields", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("submits the entered credentials to the signup action", async () => {
    vi.mocked(signup).mockResolvedValue(undefined);
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(signup).mock.calls[0][1];
    expect(formData.get("username")).toBe("example");
    expect(formData.get("email")).toBe("new@example.com");
    expect(formData.get("password")).toBe("secret123");
  });

  it("shows the error message returned by the signup action", async () => {
    vi.mocked(signup).mockResolvedValue({ error: "User already registered" });
    render(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "example" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "User already registered",
    );
  });
});
