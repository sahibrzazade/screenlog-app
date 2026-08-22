"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validation/username";

export type UpdateUsernameState = { error?: string; success?: boolean };

const UNIQUE_VIOLATION = "23505";

export const updateUsername = async (
  _prevState: UpdateUsernameState,
  formData: FormData,
): Promise<UpdateUsernameState> => {
  const parsed = usernameSchema.safeParse({
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to set a username." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", user.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "That username is already taken." };
    }
    return { error: "Failed to update username. Please try again." };
  }

  revalidatePath("/settings");
  return { success: true };
};
