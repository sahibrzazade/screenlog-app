"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { showLogSchema } from "@/lib/validation/show-log";

export type LogShowFormState = { error: string } | { success: true } | undefined;

export const logShow = async (
  _prevState: LogShowFormState,
  formData: FormData,
): Promise<LogShowFormState> => {
  const parsed = showLogSchema.safeParse({
    tmdbShowId: formData.get("tmdbShowId"),
    rating: formData.get("rating"),
    review: formData.get("review"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a show." };
  }

  const { error } = await supabase.from("show_logs").upsert(
    {
      user_id: user.id,
      tmdb_show_id: parsed.data.tmdbShowId,
      rating: parsed.data.rating,
      review: parsed.data.review ?? null,
    },
    { onConflict: "user_id,tmdb_show_id" },
  );

  if (error) {
    return { error: "Failed to save your log. Please try again." };
  }

  revalidatePath(`/tv/${parsed.data.tmdbShowId}`);
  return { success: true };
};
