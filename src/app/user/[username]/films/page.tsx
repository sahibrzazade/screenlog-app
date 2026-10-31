import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/lib/public-profile";
import { PaginatedDiaryList } from "@/components/paginated-diary-list";

type UserFilmsPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[]; view?: string | string[] }>;
};

const UserFilmsPage = async ({ params, searchParams }: UserFilmsPageProps) => {
  const { username } = await params;
  const { page, view } = await searchParams;
  const supabase = await createClient();
  const profile = await getPublicProfileByUsername(supabase, username);

  if (!profile) {
    notFound();
  }

  return (
    <PaginatedDiaryList
      title={`${profile.username}'s movies`}
      backHref={`/user/${profile.username}`}
      basePath={`/user/${profile.username}/films`}
      entries={profile.movies}
      page={page}
      view={view}
      emptyMessage="No movies logged yet."
    />
  );
};

export default UserFilmsPage;
