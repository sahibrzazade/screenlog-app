import Image from "next/image";
import Link from "next/link";
import { profileUrl } from "@/lib/tmdb/images";
import type { TmdbCastMember } from "@/lib/tmdb/types";

type CastListProps = {
  cast: TmdbCastMember[];
};

/** "Cast" section on a detail page; each member links to their actor page. Renders nothing when the cast is empty. */
export const CastList = ({ cast }: CastListProps) => {
  if (cast.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Cast</h2>
      <ul className="mt-2 flex gap-4 overflow-x-auto pb-1">
        {cast.map((member) => {
          const photo = profileUrl(member.profile_path);

          return (
            <li key={member.id} className="w-20 shrink-0 text-center text-xs">
              <Link
                href={`/actor/${member.id}`}
                className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-2/3 w-20 overflow-hidden rounded bg-surface">
                  {photo && (
                    // Decorative: the name below already labels the link.
                    <Image
                      src={photo}
                      alt=""
                      width={92}
                      height={138}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  )}
                </div>
                <p className="mt-1 font-medium transition-colors group-hover:text-accent">
                  {member.name}
                </p>
                <p className="text-muted-foreground">{member.character}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
