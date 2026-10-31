import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { getWatchlistItems } from "@/lib/watchlist";
import { WatchlistGrid } from "@/components/watchlist-grid";

type UserWatchlistPageProps = {
  params: Promise<{ username: string }>;
};

/**
 * One watchlist page for everyone: the owner gets the editable grid (remove
 * buttons), visitors — guests included — the same grid read-only. Ownership
 * comes from the verified session; writes are owner-only in RLS regardless.
 */
const UserWatchlistPage = async ({ params }: UserWatchlistPageProps) => {
  const { username } = await params;
  const supabase = await createClient();

  const [profile, authResult] = await Promise.all([
    getPublicProfileByUsername(supabase, username),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = authResult.data.user?.id === profile.id;
  const items = await getWatchlistItems(supabase, profile.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link
        href={`/user/${profile.username}`}
        className="text-sm text-accent hover:text-accent-hover"
      >
        ← Back to profile
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{profile.username}&apos;s watchlist</h1>
      <WatchlistGrid
        initialItems={items}
        editable={isOwner}
        emptyMessage={isOwner ? "Nothing on your watchlist yet." : "Nothing on the watchlist yet."}
      />
    </main>
  );
};

export default UserWatchlistPage;
