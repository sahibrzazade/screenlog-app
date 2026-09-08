import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Server-action helper: creates the Supabase server client and reads the
 * signed-in user in one step. Returns `user: null` when there's no session —
 * each caller decides what error state that maps to.
 */
export const getUserContext = async (): Promise<{
  supabase: SupabaseServerClient;
  user: User | null;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
};
