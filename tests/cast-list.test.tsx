import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CastList } from "@/components/detail/cast-list";

afterEach(cleanup);

const cast = [
  { id: 287, name: "Brad Pitt", character: "Tyler Durden", profile_path: "/brad.jpg", order: 0 },
  { id: 819, name: "Edward Norton", character: "The Narrator", profile_path: null, order: 1 },
];

describe("CastList", () => {
  it("links every cast member to their actor page", () => {
    render(<CastList cast={cast} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Brad Pitt/ })).toHaveAttribute("href", "/actor/287");
    expect(screen.getByRole("link", { name: /Edward Norton/ })).toHaveAttribute("href", "/actor/819");
  });

  it("names each link once, with the character", () => {
    render(<CastList cast={cast} />);
    expect(screen.getByRole("link", { name: "Brad Pitt Tyler Durden" })).toBeInTheDocument();
  });

  it("renders nothing for an empty cast", () => {
    const { container } = render(<CastList cast={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
