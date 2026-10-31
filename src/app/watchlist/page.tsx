import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * /watchlist no longer renders its own grid — /user/[username]/watchlist is
 * the one watchlist page for owner and visitors alike. This stays only so the
 * navbar link and old bookmarks land on the signed-in user's own watchlist.
 */
const WatchlistRedirectPage = async () => {
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

  redirect(profile?.username ? `/user/${profile.username}/watchlist` : "/choose-username");
};

export default WatchlistRedirectPage;
