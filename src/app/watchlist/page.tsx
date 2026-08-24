import { createClient } from "@/lib/supabase/server";
import { getWatchlistItems } from "@/lib/watchlist";
import { WatchlistGrid } from "@/components/watchlist-grid";

const WatchlistPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = user ? await getWatchlistItems(supabase, user.id) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Watchlist</h1>
      <WatchlistGrid initialItems={items} />
    </main>
  );
};

export default WatchlistPage;
