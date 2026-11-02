import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { StatsPeriodLinks } from "@/components/stats-period-links";
import { StatsTotals } from "@/components/stats-totals";
import { StatsBarChart } from "@/components/stats-bar-chart";
import { ChartColumn } from "lucide-react";

afterEach(cleanup);

describe("StatsBarChart", () => {
  const bars = [
    { label: "Jan", title: "January 2026", count: 4, films: 1, tv: 3 },
    { label: "Feb", title: "February 2026", count: 0, films: 0, tv: 0 },
    { label: "Mar", title: "March 2026", count: 1200, films: 1199, tv: 1 },
  ];
  const renderChart = () =>
    render(<StatsBarChart title="Activity" icon={ChartColumn} bars={bars} caption="Entries per month in 2026" />);

  it("names every bar with its full title and films / TV split, zeros included", () => {
    renderChart();
    expect(screen.getByRole("region", { name: "Activity" })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: "Entries per month in 2026" });
    expect(within(group).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "January 2026: 4 entries, 1 film, 3 TV",
      "February 2026: 0 entries",
      "March 2026: 1,200 entries, 1,199 films, 1 TV",
    ]);
  });

  it("prints non-zero counts above the bars without hovering", () => {
    renderChart();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the films / TV split on hover and hides it on leave", () => {
    renderChart();
    const group = screen.getByRole("group", { name: "Entries per month in 2026" });
    fireEvent.mouseEnter(screen.getByRole("button", { name: /^January/ }));
    expect(screen.getByText("1 film · 3 TV")).toBeInTheDocument();
    fireEvent.mouseLeave(group);
    expect(screen.queryByText("1 film · 3 TV")).not.toBeInTheDocument();
  });

  it("is one tab stop and moves between bars with the arrow keys", () => {
    renderChart();
    const [jan, feb, mar] = screen.getAllByRole("button");
    expect([jan, feb, mar].map((button) => button.tabIndex)).toEqual([0, -1, -1]);

    jan.focus();
    fireEvent.keyDown(jan, { key: "ArrowRight" });
    expect(feb).toHaveFocus();
    expect(screen.getByText("February 2026")).toBeInTheDocument();
    fireEvent.keyDown(feb, { key: "End" });
    expect(mar).toHaveFocus();
    expect(mar.tabIndex).toBe(0);
    expect(screen.getByText("1,199 films · 1 TV")).toBeInTheDocument();
  });

  it("uses the short axis label but keeps the full title for screen readers", () => {
    render(
      <StatsBarChart
        title="Activity"
        icon={ChartColumn}
        bars={[{ label: "2023", shortLabel: "'23", title: "2023", count: 1, films: 1, tv: 0 }]}
        caption="Entries per year"
      />,
    );
    expect(screen.getByText("'23")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2023: 1 entry, 1 film, 0 TV" })).toBeInTheDocument();
  });

  it("shows the empty message instead of bars when every count is zero", () => {
    render(
      <StatsBarChart
        title="Ratings"
        icon={ChartColumn}
        bars={[{ label: "0.5", title: "0.5 stars", count: 0, films: 0, tv: 0 }]}
        caption="c"
        emptyMessage="No rated entries in 2026."
      />,
    );
    expect(screen.getByText("No rated entries in 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

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
