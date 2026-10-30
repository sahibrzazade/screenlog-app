"use server";

import { z } from "zod";
import { getUserContext } from "@/lib/supabase/auth";
import { getActivityFeed, type ActivityPage } from "@/lib/activity";

const cursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  key: z.string().min(1).max(100),
});

/** "Show more" for the home page activity feed: the page after `cursor`. */
export const loadMoreActivity = async (cursor: unknown): Promise<ActivityPage> => {
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) {
    throw new Error("Invalid cursor");
  }

  const { supabase, user } = await getUserContext();
  if (!user) {
    throw new Error("You must be logged in to see your activity feed.");
  }

  return getActivityFeed(supabase, user.id, parsed.data);
};
