import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileSummary } from "@/lib/profile";
import { ProfileSection, type ProfileSectionItem } from "@/components/profile-section";
import type { MediaCardItem } from "@/components/media-card";
import type { DiaryEntry } from "@/lib/diary";

const toWatchlistSectionItem = (item: MediaCardItem): ProfileSectionItem => ({
  id: `${item.mediaType}-${item.id}`,
  title: item.title,
  posterPath: item.posterPath,
  href: `/${item.mediaType}/${item.id}`,
});

const toDiarySectionItem = (entry: DiaryEntry): ProfileSectionItem => ({
  id: entry.id,
  title: entry.title,
  posterPath: entry.posterPath,
  href: entry.href,
});

const ProfilePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const summary = await getProfileSummary(supabase, user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <ProfileSection
        title="Watchlist"
        items={summary.watchlist.items.map(toWatchlistSectionItem)}
        total={summary.watchlist.total}
        seeAllHref="/watchlist"
        emptyMessage="Nothing on your watchlist yet."
      />

      <ProfileSection
        title="Movies"
        items={summary.movies.items.map(toDiarySectionItem)}
        total={summary.movies.total}
        seeAllHref="/diary"
        emptyMessage="No movies logged yet."
      />

      <ProfileSection
        title="Shows"
        items={summary.shows.items.map(toDiarySectionItem)}
        total={summary.shows.total}
        seeAllHref="/diary"
        emptyMessage="No shows logged yet."
      />
    </main>
  );
};

export default ProfilePage;
