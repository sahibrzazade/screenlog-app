import { createClient } from "@/lib/supabase/server";
import { getDiaryData } from "@/lib/diary";
import { DiaryEntry } from "@/components/diary-entry";

const DiaryPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { movies, shows } = user
    ? await getDiaryData(supabase, user.id)
    : { movies: [], shows: [] };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Diary</h1>

      {movies.length === 0 && shows.length === 0 ? (
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">
          Nothing logged yet.
        </p>
      ) : (
        <>
          <section className="mt-4">
            <h2 className="text-lg font-semibold">Movies</h2>
            {movies.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                No movies logged yet.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {movies.map((entry) => (
                  <DiaryEntry key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Shows</h2>
            {shows.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                No shows logged yet.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {shows.map((entry) => (
                  <DiaryEntry key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default DiaryPage;
