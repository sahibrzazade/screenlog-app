"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

type RatingStarsProps = {
  name?: string;
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  hideClearButton?: boolean;
  /**
   * Interactive stars for a sidebar card: 24px from `sm` up. On phones the row
   * fills its container and each star gets a 44px-tall tap cell around a 32px icon.
   */
  compact?: boolean;
  /** Tiny read-only stars (14px) for dense layouts, e.g. under a grid poster. */
  small?: boolean;
};

export const RatingStars = ({
  name = "rating",
  value,
  onChange,
  readOnly = false,
  hideClearButton = false,
  compact = false,
  small = false,
}: RatingStarsProps) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const displayValue = hoveredValue ?? value;
  const touchCompact = compact && !readOnly;
  const starSizeClass = small
    ? "h-3.5 w-3.5"
    : readOnly
      ? "h-6 w-6"
      : compact
        ? "h-8 w-8 sm:h-6 sm:w-6"
        : "h-12 w-12";
  const gapClass = small ? "gap-0.5" : touchCompact ? "sm:gap-1" : "gap-2";
  // The tap cell (holds the half-star radio labels) vs. the visible star inside it.
  const cellClass = touchCompact
    ? "relative flex h-11 flex-1 items-center justify-center rounded sm:inline-block sm:h-6 sm:w-6 sm:flex-none"
    : `relative inline-block ${starSizeClass} rounded`;

  return (
    <div
      className={
        touchCompact
          ? "flex flex-1 items-center sm:inline-flex sm:flex-none"
          : `inline-flex items-center ${gapClass}`
      }
    >
      <div
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `${value} out of 5 stars` : "Rating"}
        className={
          touchCompact
            ? `flex flex-1 sm:inline-flex sm:flex-none ${gapClass}`
            : `inline-flex flex-wrap ${gapClass}`
        }
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
                  ? `relative inline-block ${starSizeClass}`
                  : `${cellClass} has-focus-visible:ring-2 has-focus-visible:ring-ring`
              }
            >
              <span className={`pointer-events-none relative block ${starSizeClass}`}>
                <Star
                  aria-hidden
                  className={`absolute inset-0 text-muted-foreground ${starSizeClass}`}
                />
                {fillLevel > 0 && (
                  <span
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: fillLevel === 1 ? "100%" : "50%" }}
                  >
                    <Star className={`fill-accent text-accent ${starSizeClass}`} />
                  </span>
                )}
              </span>
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
