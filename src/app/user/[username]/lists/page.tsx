import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserLists } from "@/lib/lists";
import { ListCards } from "@/components/list-cards";
import { ListDeletedToast } from "@/components/list-deleted-toast";
import { NewListButton } from "@/components/new-list-button";
import { PaginationLinks } from "@/components/pagination-links";

type UserListsPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[]; deleted?: string | string[] }>;
};

/**
 * A user's lists, most recently updated first. Public like the rest of the
 * profile; only the owner, decided from the verified session, can add one.
 */
const UserListsPage = async ({ params, searchParams }: UserListsPageProps) => {
  const { username } = await params;
  const { page, deleted } = await searchParams;
  const supabase = await createClient();

  const [{ data: profile }, authResult] = await Promise.all([
    supabase.from("profiles_public").select("id, username").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = authResult.data.user?.id === profile.id;
  const basePath = `/user/${profile.username}/lists`;
  const { lists, currentPage, totalPages } = await getUserLists(supabase, profile.id, page);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      {deleted === "1" && <ListDeletedToast listsPath={basePath} />}
      <Link href={`/user/${profile.username}`} className="text-sm text-accent hover:text-accent-hover">
        ← Back to profile
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold [overflow-wrap:anywhere]">{profile.username}&apos;s lists</h1>
        {isOwner && <NewListButton username={profile.username} />}
      </div>

      {lists.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          {isOwner ? "You haven't" : `${profile.username} hasn't`} created any lists yet.
        </p>
      ) : (
        <>
          <ListCards lists={lists} username={profile.username} />
          <PaginationLinks
            currentPage={currentPage}
            totalPages={totalPages}
            hrefFor={(target) => (target === 1 ? basePath : `${basePath}?page=${target}`)}
          />
        </>
      )}
    </main>
  );
};

export default UserListsPage;
