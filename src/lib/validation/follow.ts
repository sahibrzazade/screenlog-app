import { z } from "zod";

export const followToggleSchema = z.object({
  targetUserId: z.uuid(),
  following: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type FollowToggleInput = z.infer<typeof followToggleSchema>;
