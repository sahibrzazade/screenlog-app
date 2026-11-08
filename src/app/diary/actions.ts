"use server";

import { z } from "zod";
import { getUserContext } from "@/lib/supabase/auth";
import { getDiaryPage, type DiaryPage } from "@/lib/diary-timeline";

const cursorSchema = z.object({
  watchedDate: z.iso.date(),
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

/** "Show more" on the diary: the signed-in user's page after `cursor`. */
export const loadMoreDiary = async (cursor: unknown): Promise<DiaryPage> => {
  const parsed = cursorSchema.safeParse(cursor);
  if (!parsed.success) {
    throw new Error("Invalid cursor");
  }

  const { supabase, user } = await getUserContext();
  if (!user) {
    throw new Error("You must be logged in to see your diary.");
  }

  return getDiaryPage(supabase, user.id, parsed.data);
};
