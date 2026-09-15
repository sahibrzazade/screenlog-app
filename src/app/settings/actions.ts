"use server";

import { nowWatchingIdSchema, showcaseIdsSchema } from "@/lib/validation/showcase";
import {
  updateShowcaseColumn,
  type ShowcaseMutationState,
} from "@/lib/showcase-mutations";

export type UpdateShowcaseState = ShowcaseMutationState;

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
