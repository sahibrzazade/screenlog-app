import Image from "next/image";
import { notFound } from "next/navigation";
import { tmdbFetch } from "@/lib/tmdb/client";
import { createClient } from "@/lib/supabase/server";
import { PersonBio } from "@/components/person/person-bio";
import { Filmography, KnownForRow } from "@/components/person/person-credits";
import { shapePersonCredits } from "@/lib/tmdb/person-credits";
import { formatPersonLife } from "@/lib/tmdb/person-life";
import { fetchWatchedTitleKeys } from "@/lib/watched-titles";
import { profileUrl } from "@/lib/tmdb/images";
import type { TmdbPersonDetails } from "@/lib/tmdb/types";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

const PersonPage = async ({ params }: PersonPageProps) => {
  const { id } = await params;
  const personId = Number(id);

  if (!Number.isInteger(personId) || personId <= 0) {
    notFound();
  }

  let person: TmdbPersonDetails;
  try {
    person = await tmdbFetch<TmdbPersonDetails>(`/person/${personId}`, {
      append_to_response: "combined_credits",
    });
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { knownFor, filmography } = shapePersonCredits(person.combined_credits?.cast ?? []);
  const idsOf = (mediaType: "movie" | "tv") =>
    filmography.filter((credit) => credit.mediaType === mediaType).map((credit) => credit.id);

  const watchedKeys = user
    ? await fetchWatchedTitleKeys(supabase, user.id, idsOf("movie"), idsOf("tv"))
    : null;

  const photo = profileUrl(person.profile_path);
  const { born, died } = formatPersonLife(person.birthday, person.deathday, person.place_of_birth);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="w-48 shrink-0 self-center sm:sticky sm:top-20 sm:self-start">
          <div className="overflow-hidden rounded-md bg-surface">
            {photo ? (
              <Image
                src={photo}
                alt={person.name}
                width={185}
                height={278}
                className="h-auto w-full"
                preload
              />
            ) : (
              <div className="flex aspect-2/3 items-center justify-center text-center text-xs text-subtle-foreground">
                No photo
              </div>
            )}
          </div>
          {/* Inside the sticky column so the name stays in view while scrolling the credits. */}
          <h1 className="mt-3 text-center text-xl font-semibold text-balance sm:text-left">
            {person.name}
          </h1>
          {(born || died) && (
            <div className="mt-1 space-y-0.5 text-center text-sm text-muted-foreground sm:text-left">
              {born && <p>{born}</p>}
              {died && <p>{died}</p>}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 sm:[&>*:first-child]:mt-0">
          <PersonBio biography={person.biography ?? ""} />

          <KnownForRow credits={knownFor} watchedKeys={watchedKeys} />

          <Filmography credits={filmography} watchedKeys={watchedKeys} />
        </div>
      </div>
    </main>
  );
};

export default PersonPage;
