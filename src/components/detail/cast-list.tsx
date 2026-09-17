import Image from "next/image";
import { profileUrl } from "@/lib/tmdb/images";
import type { TmdbCastMember } from "@/lib/tmdb/types";

type CastListProps = {
  cast: TmdbCastMember[];
};

/** "Cast" section on a detail page. Renders nothing when the cast is empty. */
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
              <div className="aspect-2/3 w-20 overflow-hidden rounded bg-surface">
                {photo && (
                  <Image
                    src={photo}
                    alt={member.name}
                    width={92}
                    height={138}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <p className="mt-1 font-medium">{member.name}</p>
              <p className="text-muted-foreground">{member.character}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
