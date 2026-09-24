"use server";

import { getUserContext } from "@/lib/supabase/auth";
import { nowWatchingIdSchema, showcaseIdsSchema } from "@/lib/validation/showcase";
import { changePasswordSchema } from "@/lib/validation/password";
import {
  updateShowcaseColumn,
  type ShowcaseMutationState,
} from "@/lib/showcase-mutations";

export type UpdateShowcaseState = ShowcaseMutationState;
export type ChangePasswordState = { error: string } | { success: true } | undefined;

const parseJsonIds = (raw: FormDataEntryValue | null): unknown => {
  try {
    return JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }
};

export const updateTopMovies = async (
  _prevState: UpdateShowcaseState,
  formData: FormData,
): Promise<UpdateShowcaseState> => {
  const parsed = showcaseIdsSchema.safeParse(parseJsonIds(formData.get("ids")));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return updateShowcaseColumn("top_movie_ids", parsed.data);
};

export const updateTopShows = async (
  _prevState: UpdateShowcaseState,
  formData: FormData,
): Promise<UpdateShowcaseState> => {
  const parsed = showcaseIdsSchema.safeParse(parseJsonIds(formData.get("ids")));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return updateShowcaseColumn("top_show_ids", parsed.data);
};

export const updateNowWatching = async (
  _prevState: UpdateShowcaseState,
  formData: FormData,
): Promise<UpdateShowcaseState> => {
  const raw = formData.get("nowWatchingShowId");
  const parsed = nowWatchingIdSchema.safeParse(raw === "" ? null : raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return updateShowcaseColumn("now_watching_show_id", parsed.data);
};

export const changePassword = async (
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> => {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user } = await getUserContext();
  if (!user || !user.email) {
    return { error: "You must be logged in to do this." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return { error: "Failed to change your password. Please try again." };
  }

  return { success: true };
};
