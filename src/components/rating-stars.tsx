"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

type RatingStarsProps = {
  name?: string;
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  hideClearButton?: boolean;
};

export const RatingStars = ({
  name = "rating",
  value,
  onChange,
  readOnly = false,
  hideClearButton = false,
}: RatingStarsProps) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const displayValue = hoveredValue ?? value;

  return (
    <div className="inline-flex items-center gap-2">
      <div
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `${value} out of 5 stars` : "Rating"}
        className="inline-flex gap-2"
        onMouseLeave={readOnly ? undefined : () => setHoveredValue(null)}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const starIndex = i + 1;
          const fillLevel = !displayValue
            ? 0
            : displayValue >= starIndex
              ? 1
              : displayValue >= starIndex - 0.5
                ? 0.5
                : 0;

          return (
            <span
              key={starIndex}
              className={
                readOnly
                  ? "relative inline-block h-6 w-6"
                  : "relative inline-block h-12 w-12 rounded has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              }
            >
              <Star
                aria-hidden
                className={`pointer-events-none absolute inset-0 text-muted-foreground ${readOnly ? "h-6 w-6" : "h-12 w-12"}`}
              />
              {fillLevel > 0 && (
                <span
                  className="pointer-events-none absolute inset-0 overflow-hidden"
                  style={{ width: fillLevel === 1 ? "100%" : "50%" }}
                >
                  <Star
                    className={`fill-accent text-accent ${readOnly ? "h-6 w-6" : "h-12 w-12"}`}
                  />
                </span>
              )}
              {!readOnly &&
                [starIndex - 0.5, starIndex].map((starValue) => (
                  <label
                    key={starValue}
                    className={`absolute inset-y-0 w-1/2 cursor-pointer ${
                      starValue % 1 === 0 ? "right-0" : "left-0"
                    }`}
                    onMouseEnter={() => setHoveredValue(starValue)}
                  >
                    <input
                      type="radio"
                      name={name}
                      value={starValue}
                      checked={value === starValue}
                      onChange={() => onChange?.(starValue)}
                      className="sr-only"
                    />
                    <span className="sr-only">Rate {starValue} out of 5 stars</span>
                  </label>
                ))}
            </span>
          );
        })}
      </div>

      {!readOnly && !hideClearButton && value !== null && (
        <button
          type="button"
          onClick={() => onChange?.(null)}
          aria-label="Clear rating"
          className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
};
