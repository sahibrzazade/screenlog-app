import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

const Greeting = () => <h1>Screenlog</h1>;

describe("vitest + react testing library setup", () => {
  it("renders a component", () => {
    render(<Greeting />);
    expect(screen.getByRole("heading", { name: "Screenlog" })).toBeDefined();
  });
});
