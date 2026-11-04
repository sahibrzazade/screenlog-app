import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLikedReviews } from "@/lib/liked-reviews";
import { LikedReviewList } from "@/components/liked-review-list";
import { PaginationLinks } from "@/components/pagination-links";

type UserLikesPageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

/**
 * Reviews a user liked, newest like first. Public like the rest of the
 * profile (likes and logs are publicly readable, 0009 / 0018).
 */
const UserLikesPage = async ({ params, searchParams }: UserLikesPageProps) => {
  const { username } = await params;
  const { page } = await searchParams;
  const supabase = await createClient();

  const [{ data: profile }, authResult] = await Promise.all([
    supabase.from("profiles_public").select("id, username").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const viewerId = authResult.data.user?.id ?? null;
  const basePath = `/user/${profile.username}/likes`;
  const { reviews, currentPage, totalPages } = await getLikedReviews(supabase, profile.id, viewerId, page);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/user/${profile.username}`} className="text-sm text-accent hover:text-accent-hover">
        ← Back to profile
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{profile.username}&apos;s liked reviews</h1>

      {reviews.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          {viewerId === profile.id ? "You haven't" : `${profile.username} hasn't`} liked any reviews yet.
        </p>
      ) : (
        <>
          <LikedReviewList reviews={reviews} viewerId={viewerId} />
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

export default UserLikesPage;
