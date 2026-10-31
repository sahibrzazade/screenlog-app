import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { PaginatedDiaryList } from "@/components/paginated-diary-list";

type UserShowsPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[]; view?: string | string[] }>;
};

const UserShowsPage = async ({ params, searchParams }: UserShowsPageProps) => {
  const { username } = await params;
  const { page, view } = await searchParams;
  const supabase = await createClient();
  const profile = await getPublicProfileByUsername(supabase, username);

  if (!profile) {
    notFound();
  }

  return (
    <PaginatedDiaryList
      title={`${profile.username}'s shows`}
      backHref={`/user/${profile.username}`}
      basePath={`/user/${profile.username}/shows`}
      entries={profile.shows}
      page={page}
      view={view}
      emptyMessage="No shows logged yet."
    />
  );
};

export default UserShowsPage;
