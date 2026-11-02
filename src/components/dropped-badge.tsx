import { CircleSlash } from "lucide-react";

type DroppedBadgeProps = {
  /** "overlay" sits on a poster corner (poster-only grids); "inline" sits next to text. */
  variant?: "inline" | "overlay";
};

/**
 * Marks a dropped show log. Same icon and neutral palette as the log card's
 * "Dropped" pill — never red (not an error) or gold (not an achievement).
 */
export const DroppedBadge = ({ variant = "inline" }: DroppedBadgeProps) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs leading-none ${
      variant === "overlay"
        ? "absolute bottom-1.5 left-1.5 border-foreground/30 bg-background/85 text-foreground backdrop-blur-sm"
        : "border-foreground/30 bg-foreground/10 text-foreground"
    }`}
  >
    <CircleSlash className="size-3" aria-hidden />
    Dropped
  </span>
);
