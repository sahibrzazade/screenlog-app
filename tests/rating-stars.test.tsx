import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RatingStars } from "@/components/rating-stars";

afterEach(() => {
  cleanup();
});

describe("RatingStars", () => {
  it("renders a radiogroup labeled Rating", () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeInTheDocument();
  });

  it("exposes every 0.5 increment from 0.5 to 5", () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);
    [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].forEach((starValue) => {
      expect(screen.getByLabelText(`Rate ${starValue} out of 5 stars`)).toBeInTheDocument();
    });
  });

  it("calls onChange with the clicked value", () => {
    const onChange = vi.fn();
    render(<RatingStars value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Rate 3.5 out of 5 stars"));
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it("marks only the matching radio as checked", () => {
    render(<RatingStars value={4} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Rate 4 out of 5 stars")).toBeChecked();
    expect(screen.getByLabelText("Rate 3.5 out of 5 stars")).not.toBeChecked();
    expect(screen.getByLabelText("Rate 4.5 out of 5 stars")).not.toBeChecked();
  });

  it("shows no clear control when there is no rating", () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear rating" })).not.toBeInTheDocument();
  });

  it("clears the rating via the clear control", () => {
    const onChange = vi.fn();
    render(<RatingStars value={4} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear rating" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("hides the clear control when hideClearButton is set", () => {
    render(<RatingStars value={4} onChange={vi.fn()} hideClearButton />);
    expect(screen.queryByRole("button", { name: "Clear rating" })).not.toBeInTheDocument();
  });

  it("does not mark any star input as required", () => {
    render(<RatingStars value={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Rate 3 out of 5 stars")).not.toBeRequired();
  });

  describe("readOnly", () => {
    it("renders no radiogroup or inputs", () => {
      render(<RatingStars value={3.5} onChange={vi.fn()} readOnly />);
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    });

    it("exposes the rating value via an accessible label", () => {
      render(<RatingStars value={3.5} onChange={vi.fn()} readOnly />);
      expect(screen.getByRole("img", { name: "3.5 out of 5 stars" })).toBeInTheDocument();
    });

    it("is not clickable", () => {
      const onChange = vi.fn();
      render(<RatingStars value={2} onChange={onChange} readOnly />);
      fireEvent.click(screen.getByRole("img", { name: "2 out of 5 stars" }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
