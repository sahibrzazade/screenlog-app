import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /profile no longer renders its own dashboard — the unified
 * /user/[username] route handles both the owner and visitor views now.
 * This stays only so old links/bookmarks land somewhere sensible instead
 * of 404ing.
 */
const ProfileRedirectPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  redirect(profile?.username ? `/user/${profile.username}` : "/choose-username");
};

export default ProfileRedirectPage;
