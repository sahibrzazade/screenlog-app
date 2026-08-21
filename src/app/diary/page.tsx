import { createClient } from "@/lib/supabase/server";
import { getDiaryData } from "@/lib/diary";
import { DiaryEntry } from "@/components/diary-entry";

const DiaryPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { entries, showRatings } = user
    ? await getDiaryData(supabase, user.id)
    : { entries: [], showRatings: [] };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Diary</h1>
      {entries.length === 0 ? (
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Nothing logged yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1">
          {entries.map((entry) => (
            <DiaryEntry key={`${entry.mediaType}-${entry.id}`} entry={entry} />
          ))}
        </ul>
      )}

      {showRatings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Show ratings</h2>
          <p className="text-xs text-neutral-500">
            Overall show ratings aren&apos;t tied to a single watch date.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {showRatings.map((rating) => (
              <DiaryEntry key={rating.id} entry={rating} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};

export default DiaryPage;
