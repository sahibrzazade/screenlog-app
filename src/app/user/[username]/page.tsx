import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { getWatchlistItems } from "@/lib/watchlist";
import { ProfileSection, type ProfileSectionItem } from "@/components/profile-section";
import type { MediaCardItem } from "@/components/media-card";
import type { DiaryEntry } from "@/lib/diary";

const toShowcaseSectionItem = (item: MediaCardItem): ProfileSectionItem => ({
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

/** How many items a preview section (Watchlist/Movies/Shows) shows before "See all". */
const SECTION_PREVIEW_LIMIT = 4;

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

/**
 * A single profile route for both audiences: the signed-in owner viewing
 * their own username gets the fuller "my profile" experience (watchlist,
 * settings shortcut); anyone else (including guests) gets the read-only
 * public view. The distinction is computed server-side from the verified
 * session — never from anything the client supplies — and the watchlist
 * section additionally stays behind the `watchlist` table's owner-only RLS,
 * so a mistake here couldn't leak it to the wrong viewer.
 */
const PublicProfilePage = async ({ params }: PublicProfilePageProps) => {
  const { username } = await params;
  const supabase = await createClient();

  const [profile, authResult] = await Promise.all([
    getPublicProfileByUsername(supabase, username),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const viewer = authResult.data.user;
  const isOwner = viewer?.id === profile.id;
  const watchlistItems = isOwner ? await getWatchlistItems(supabase, profile.id) : [];

  const nowWatchingItems = profile.showcase.nowWatching ? [profile.showcase.nowWatching] : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-surface">
            <Image
              src={profile.avatarUrl || "/default-avatar.png"}
              alt={`${profile.username}'s avatar`}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{profile.username}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.movies.length} film{profile.movies.length === 1 ? "" : "s"} ·{" "}
              {profile.shows.length} show{profile.shows.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {isOwner && (
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="size-5" />
          </Link>
        )}
      </div>

      <ProfileSection
        title="Currently watching"
        items={nowWatchingItems.map(toShowcaseSectionItem)}
        total={nowWatchingItems.length}
        seeAllHref={`/user/${profile.username}`}
        emptyMessage="Not watching anything right now."
        editHref={isOwner ? "/settings" : undefined}
      />

      <ProfileSection
        title="Top 4 movies"
        items={profile.showcase.topMovies.map(toShowcaseSectionItem)}
        total={profile.showcase.topMovies.length}
        seeAllHref={`/user/${profile.username}`}
        emptyMessage="No favourite movies picked yet."
        capacity={4}
        editHref={isOwner ? "/settings" : undefined}
      />

      <ProfileSection
        title="Top 4 shows"
        items={profile.showcase.topShows.map(toShowcaseSectionItem)}
        total={profile.showcase.topShows.length}
        seeAllHref={`/user/${profile.username}`}
        emptyMessage="No favourite shows picked yet."
        capacity={4}
        editHref={isOwner ? "/settings" : undefined}
      />

      {isOwner && (
        <ProfileSection
          title="Watchlist"
          items={watchlistItems.slice(0, SECTION_PREVIEW_LIMIT).map(toShowcaseSectionItem)}
          total={watchlistItems.length}
          seeAllHref="/watchlist"
          emptyMessage="Nothing on your watchlist yet."
        />
      )}

      <ProfileSection
        title="Movies"
        items={profile.movies.slice(0, SECTION_PREVIEW_LIMIT).map(toDiarySectionItem)}
        total={profile.movies.length}
        seeAllHref={`/user/${profile.username}/films`}
        emptyMessage="No movies logged yet."
      />

      <ProfileSection
        title="Shows"
        items={profile.shows.slice(0, SECTION_PREVIEW_LIMIT).map(toDiarySectionItem)}
        total={profile.shows.length}
        seeAllHref={`/user/${profile.username}/shows`}
        emptyMessage="No shows logged yet."
      />
    </main>
  );
};

export default PublicProfilePage;
