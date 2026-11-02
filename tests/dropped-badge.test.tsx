import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DiaryEntry } from "@/components/diary-entry";
import { DiaryGrid } from "@/components/diary-grid";
import { ProfileSection } from "@/components/profile-section";
import { ReviewList } from "@/components/review-list";

afterEach(cleanup);

const entry = (dropped: boolean) => ({
  id: dropped ? "dropped" : "completed",
  title: dropped ? "Dropped Show" : "Finished Show",
  posterPath: null,
  rating: null,
  review: null,
  watchedDate: "2026-01-01",
  href: "/tv/1",
  dropped,
});

describe("Dropped label", () => {
  it("shows next to a dropped entry in the diary list, not a completed one", () => {
    render(
      <ul>
        <DiaryEntry entry={entry(true)} />
        <DiaryEntry entry={entry(false)} />
      </ul>,
    );
    expect(screen.getAllByText("Dropped")).toHaveLength(1);
    expect(screen.getByText("Dropped Show").closest("li")).toHaveTextContent("Dropped");
  });

  it("shows on a dropped poster in the diary grid", () => {
    render(<DiaryGrid entries={[entry(true), entry(false)]} />);
    expect(screen.getAllByText("Dropped")).toHaveLength(1);
  });

  it("shows on a dropped poster in a profile section and names it for screen readers", () => {
    render(
      <ProfileSection
        title="Shows"
        items={[entry(true), entry(false)]}
        total={2}
        seeAllHref="/user/a/shows"
        emptyMessage="None"
      />,
    );
    expect(screen.getAllByText("Dropped")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Dropped Show (dropped)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Finished Show" })).toBeInTheDocument();
  });

  it("shows next to a dropped show review", () => {
    render(
      <ReviewList
        viewerId={null}
        reviews={[
          { userId: "u1", username: "ann", avatarUrl: null, rating: 2, review: null, watchedDate: "2026-01-01", dropped: true },
          { userId: "u2", username: "bob", avatarUrl: null, rating: 5, review: null, watchedDate: "2026-01-01" },
        ]}
      />,
    );
    expect(screen.getAllByText("Dropped")).toHaveLength(1);
    expect(screen.getByText("ann").closest("li")).toHaveTextContent("Dropped");
  });
});
