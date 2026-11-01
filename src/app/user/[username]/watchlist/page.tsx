import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { getWatchlistItems } from "@/lib/watchlist";
import { WatchlistGrid } from "@/components/watchlist-grid";
import { WatchlistFilterLinks } from "@/components/watchlist-filter-links";
import {
  filterWatchlistItems,
  parseWatchlistFilter,
  type WatchlistFilter,
} from "@/lib/watchlist-filter";

type UserWatchlistPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
};

const emptyMessageFor = (filter: WatchlistFilter, isOwner: boolean): string => {
  const what = { all: "Nothing", movie: "No movies", tv: "No shows" }[filter];
  return `${what} on ${isOwner ? "your" : "the"} watchlist yet.`;
};

/**
 * One watchlist page for everyone: the owner gets the editable grid (remove
 * buttons), visitors — guests included — the same grid read-only. Ownership
 * comes from the verified session; writes are owner-only in RLS regardless.
 */
const UserWatchlistPage = async ({ params, searchParams }: UserWatchlistPageProps) => {
  const { username } = await params;
  const filter = parseWatchlistFilter((await searchParams).type);
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
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{profile.username}&apos;s watchlist</h1>
        {items.length > 0 && (
          <WatchlistFilterLinks basePath={`/user/${profile.username}/watchlist`} filter={filter} />
        )}
      </div>
      {/* Keyed by filter: the grid keeps its items in local state, so it must reset when the filter changes. */}
      <WatchlistGrid
        key={filter}
        initialItems={filterWatchlistItems(items, filter)}
        editable={isOwner}
        emptyMessage={emptyMessageFor(filter, isOwner)}
      />
    </main>
  );
};

export default UserWatchlistPage;
