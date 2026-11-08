import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDiaryCount, getDiaryPage } from "@/lib/diary-timeline";
import { DiaryTimeline } from "@/components/diary-timeline";

/** The signed-in user's own diary: every log in one dated list. Private. */
const DiaryPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ entries, nextCursor }, total] = await Promise.all([
    getDiaryPage(supabase, user.id),
    getDiaryCount(supabase, user.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Diary</h1>
        {total > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {total} {total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {entries.length === 0 && !nextCursor ? (
        <p className="mt-4 text-muted-foreground">
          Nothing logged yet.{" "}
          <Link href="/discover" className="text-accent hover:text-accent-hover">
            Find something to watch
          </Link>
          .
        </p>
      ) : (
        <DiaryTimeline initialEntries={entries} initialCursor={nextCursor} />
      )}
    </main>
  );
};

export default DiaryPage;
