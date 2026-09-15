import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/supabase/auth";

export type ShowcaseMutationState = { error: string } | { success: true } | undefined;

type ShowcaseColumn = "top_movie_ids" | "top_show_ids" | "now_watching_show_id";

/** Owner-scoped write of a single showcase column on the caller's own profile row. */
export const updateShowcaseColumn = async (
  column: ShowcaseColumn,
  value: number[] | number | null,
): Promise<ShowcaseMutationState> => {
  const { supabase, user } = await getUserContext();
  if (!user) return { error: "You must be logged in to do this." };

  const { error } = await supabase
    .from("profiles")
    .update({ [column]: value })
    .eq("id", user.id);

  if (error) return { error: "Failed to save. Please try again." };

  revalidatePath("/settings");
  revalidatePath("/profile");
  return { success: true };
};
