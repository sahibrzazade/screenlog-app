import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { getWatchlistItems } from "@/lib/watchlist";
import { ProfileSection, type ProfileSectionItem } from "@/components/profile-section";
import { FollowButton } from "@/components/follow-button";
import { CopyProfileLinkButton } from "@/components/copy-profile-link-button";
import { ProfileStats } from "@/components/profile-stats";
import { getFollowCounts } from "@/lib/follows";
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
 * their own username gets the fuller "my profile" experience (settings
 * shortcut, edit links); anyone else (including guests) gets the read-only
 * public view. The distinction is computed server-side from the verified
 * session — never from anything the client supplies. Watchlists are
 * publicly readable (0016), so the Watchlist section is shown to everyone.
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
  const [watchlistItems, isFollowing, followCounts] = await Promise.all([
    getWatchlistItems(supabase, profile.id),
    viewer && !isOwner
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewer.id)
          .eq("following_id", profile.id)
          .maybeSingle()
          .then(({ data }) => data !== null)
      : Promise.resolve(false),
    getFollowCounts(supabase, profile.id),
  ]);

  const nowWatchingItems = profile.showcase.nowWatching ? [profile.showcase.nowWatching] : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
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
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          {/* Username and icons never wrap apart: a long username truncates instead. */}
          <div className="flex min-w-0 items-center gap-1">
            <h1 className="min-w-0 truncate text-xl font-semibold sm:text-2xl">{profile.username}</h1>
            <div className="flex shrink-0 items-center">
              <CopyProfileLinkButton username={profile.username} />
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
          </div>
          {!isOwner && viewer && (
            <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
          )}
        </div>
      </div>

      <ProfileStats
        profileId={profile.id}
        username={profile.username}
        films={profile.movies.length}
        shows={profile.shows.length}
        watchlist={watchlistItems.length}
        followers={followCounts.followers}
        following={followCounts.following}
        viewerId={viewer?.id ?? null}
      />

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

      <ProfileSection
        title="Watchlist"
        items={watchlistItems.slice(0, SECTION_PREVIEW_LIMIT).map(toShowcaseSectionItem)}
        total={watchlistItems.length}
        seeAllHref={`/user/${profile.username}/watchlist`}
        emptyMessage={isOwner ? "Nothing on your watchlist yet." : "Nothing on the watchlist yet."}
      />

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
