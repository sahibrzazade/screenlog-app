import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { StatsPeriodLinks } from "@/components/stats-period-links";
import { StatsTotals } from "@/components/stats-totals";

afterEach(cleanup);

describe("StatsPeriodLinks", () => {
  it("links every year and All time, marking the active period", () => {
    render(
      <StatsPeriodLinks basePath="/user/a/stats" years={[2026, 2024]} period={2024} currentYear={2026} />,
    );
    const nav = screen.getByRole("navigation", { name: "Stats period" });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["2026", "2024", "All time"]);
    expect(screen.getByRole("link", { name: "2026" })).toHaveAttribute("href", "/user/a/stats");
    expect(screen.getByRole("link", { name: "2024" })).toHaveAttribute("href", "/user/a/stats?year=2024");
    expect(screen.getByRole("link", { name: "2024" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All time" })).toHaveAttribute("href", "/user/a/stats?year=all");
    expect(screen.getByRole("link", { name: "All time" })).not.toHaveAttribute("aria-current");
  });
});

describe("StatsTotals", () => {
  it("shows films, shows and hours with thousand separators", () => {
    render(<StatsTotals films={12} shows={1} hours={1234} movieMinutes={0} showMinutes={1234 * 60} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Films")).toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
  });

  it("splits the watch time into films and shows in days, hours and minutes", () => {
    render(
      <StatsTotals films={5} shows={2} hours={316} movieMinutes={1440 + 130} showMinutes={12 * 1440 + 2 * 60 + 37} />,
    );
    const watchTime = screen.getByRole("group", { name: "Watch time" });
    expect(within(watchTime).getAllByRole("term").map((t) => t.textContent)).toEqual(["Films", "Shows"]);
    expect(within(watchTime).getAllByRole("definition").map((d) => d.textContent)).toEqual([
      "1 day, 2 hours and 10 minutes",
      "12 days, 2 hours and 37 minutes",
    ]);
  });

  it("leaves out a type with no watch time", () => {
    render(<StatsTotals films={0} shows={1} hours={5} movieMinutes={0} showMinutes={300} />);
    const watchTime = screen.getByRole("group", { name: "Watch time" });
    expect(within(watchTime).getAllByRole("term").map((t) => t.textContent)).toEqual(["Shows"]);
  });

  it("hides the watch-time breakdown when there is none", () => {
    render(<StatsTotals films={1} shows={0} hours={0} movieMinutes={0} showMinutes={0} />);
    expect(screen.queryByRole("group", { name: "Watch time" })).not.toBeInTheDocument();
  });

  it("pairs each label with its number as a term/description", () => {
    render(<StatsTotals films={3} shows={0} hours={1} movieMinutes={0} showMinutes={0} />);
    expect(screen.getAllByRole("term").map((t) => t.textContent)).toEqual(["Films", "Shows", "Hour"]);
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["3", "0", "1"]);
  });
});
