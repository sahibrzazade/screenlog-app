import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { LogShowForm } from "@/components/log-show-form";
import type { TmdbShowDetails } from "@/lib/tmdb/types";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

type ShowPageProps = {
  params: Promise<{ id: string }>;
};

const ShowPage = async ({ params }: ShowPageProps) => {
  const { id } = await params;
  const showId = Number(id);

  if (!Number.isInteger(showId) || showId <= 0) {
    notFound();
  }

  let show: TmdbShowDetails;
  try {
    show = await tmdbFetch<TmdbShowDetails>(`/tv/${showId}`);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingLog } = await supabase
    .from("show_logs")
    .select("rating, review")
    .eq("user_id", user.id)
    .eq("tmdb_show_id", showId)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex gap-6">
        <div className="w-40 shrink-0 overflow-hidden rounded bg-neutral-800">
          {show.poster_path ? (
            <Image
              src={`${TMDB_POSTER_BASE_URL}${show.poster_path}`}
              alt={show.name}
              width={185}
              height={278}
              className="h-auto w-full"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-center text-xs text-neutral-400">
              No poster
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{show.name}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {show.first_air_date?.slice(0, 4)}
            {show.number_of_seasons
              ? ` · ${show.number_of_seasons} season${show.number_of_seasons === 1 ? "" : "s"}`
              : ""}
          </p>
          <p className="mt-3">{show.overview}</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Your rating</h2>
        <LogShowForm
          tmdbShowId={showId}
          initialLog={
            existingLog
              ? { rating: Number(existingLog.rating), review: existingLog.review }
              : null
          }
        />
      </section>
    </main>
  );
};

export default ShowPage;
