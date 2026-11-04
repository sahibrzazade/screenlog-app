import { z } from "zod";

/** Which log table a review lives in — one per `review_likes` FK column (0018). */
export const REVIEW_KINDS = ["movie", "show", "season"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const reviewLikeToggleSchema = z.object({
  logKind: z.enum(REVIEW_KINDS),
  logId: z.uuid(),
  /** Whether the viewer currently likes it — the toggle does the opposite. */
  liked: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type ReviewLikeToggleInput = z.infer<typeof reviewLikeToggleSchema>;
