import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getList, getListItems } from "@/lib/lists";
import { LIST_ITEM_MAX } from "@/lib/validation/list";
import { ListItemsGrid } from "@/components/list-items-grid";
import { ListOwnerActions } from "@/components/list-owner-actions";

type ListPageProps = {
  params: Promise<{ username: string; listId: string }>;
};

/**
 * One list, for everyone. Only the owner, decided from the verified session,
 * gets the controls; writes are owner-only in RLS regardless.
 */
const ListPage = async ({ params }: ListPageProps) => {
  const { username, listId } = await params;
  const supabase = await createClient();

  const [{ data: profile }, authResult] = await Promise.all([
    supabase.from("profiles_public").select("id, username, avatar_url").eq("username", username).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const list = await getList(supabase, listId, profile.id);

  if (!list) {
    notFound();
  }

  const isOwner = authResult.data.user?.id === profile.id;
  const { items, total } = await getListItems(supabase, list.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href={`/user/${profile.username}/lists`} className="text-sm text-accent hover:text-accent-hover">
        ← {profile.username}&apos;s lists
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold [overflow-wrap:anywhere]">{list.title}</h1>
        {isOwner && <ListOwnerActions list={list} />}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-surface">
          <Image src={profile.avatar_url || "/default-avatar.png"} alt="" fill sizes="24px" className="object-cover" />
        </span>
        <Link href={`/user/${profile.username}`} className="min-w-0 truncate hover:text-foreground hover:underline">
          {profile.username}
        </Link>
        <span aria-hidden>·</span>
        <span className="shrink-0">
          {total} {total === 1 ? "title" : "titles"}
        </span>
      </div>
      {list.description && (
        <p className="mt-3 max-w-2xl whitespace-pre-line [overflow-wrap:anywhere]">{list.description}</p>
      )}

      {items.length === 0 && <p className="mt-4 text-muted-foreground">This list is empty.</p>}
      {(items.length > 0 || isOwner) && (
        <ListItemsGrid listId={list.id} items={items} editable={isOwner} isFull={total >= LIST_ITEM_MAX} />
      )}
    </main>
  );
};

export default ListPage;
