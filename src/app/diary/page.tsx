import { createClient } from "@/lib/supabase/server";
import { getDiaryData, type DiaryEntry as DiaryEntryData } from "@/lib/diary";
import { parseDiaryView, type DiaryView } from "@/lib/diary-view";
import { DiaryEntry } from "@/components/diary-entry";
import { DiaryGrid } from "@/components/diary-grid";
import { DiaryViewToggle } from "@/components/diary-view-toggle";

type DiaryPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const DiaryEntries = ({ entries, view }: { entries: DiaryEntryData[]; view: DiaryView }) =>
  view === "grid" ? (
    <DiaryGrid entries={entries} />
  ) : (
    <ul className="mt-2 flex flex-col gap-1">
      {entries.map((entry) => (
        <DiaryEntry key={entry.id} entry={entry} />
      ))}
    </ul>
  );

const DiaryPage = async ({ searchParams }: DiaryPageProps) => {
  const view = parseDiaryView((await searchParams).view);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { movies, shows } = user
    ? await getDiaryData(supabase, user.id)
    : { movies: [], shows: [] };
  const isEmpty = movies.length === 0 && shows.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Diary</h1>
        {!isEmpty && <DiaryViewToggle basePath="/diary" view={view} />}
      </div>

      {isEmpty ? (
        <p className="mt-4 text-muted-foreground">
          Nothing logged yet.
        </p>
      ) : (
        <>
          <section className="mt-4">
            <h2 className="text-lg font-semibold">Movies</h2>
            {movies.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No movies logged yet.
              </p>
            ) : (
              <DiaryEntries entries={movies} view={view} />
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Shows</h2>
            {shows.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No shows logged yet.
              </p>
            ) : (
              <DiaryEntries entries={shows} view={view} />
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default DiaryPage;
