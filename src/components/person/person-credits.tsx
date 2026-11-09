import { MediaCard } from "@/components/media-card";
import type { PersonCreditItem } from "@/lib/tmdb/person-credits";
import { watchedTitleKey } from "@/lib/watched-titles";

type CreditsProps = {
  credits: PersonCreditItem[];
  /** The viewer's watched titles; null for guests (no marks, no counter). */
  watchedKeys: Set<string> | null;
};

const PersonCreditCard = ({
  credit,
  watched,
}: {
  credit: PersonCreditItem;
  watched: boolean;
}) => (
  <div>
    <MediaCard {...credit} watched={watched} />
    {credit.character && (
      <p className="truncate text-xs text-muted-foreground" title={credit.character}>
        {credit.character}
      </p>
    )}
  </div>
);

const isWatched = (credit: PersonCreditItem, watchedKeys: Set<string> | null) =>
  watchedKeys?.has(watchedTitleKey(credit.mediaType, credit.id)) ?? false;

/** Horizontally scrolling "Known for" row. Renders nothing when empty. */
export const KnownForRow = ({ credits, watchedKeys }: CreditsProps) => {
  if (credits.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Known for</h2>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {credits.map((credit) => (
          <div key={`${credit.mediaType}-${credit.id}`} className="w-28 shrink-0 sm:w-32">
            <PersonCreditCard credit={credit} watched={isWatched(credit, watchedKeys)} />
          </div>
        ))}
      </div>
    </section>
  );
};

/** Every acting credit in a grid, with the viewer's watched count. */
export const Filmography = ({ credits, watchedKeys }: CreditsProps) => {
  const watchedCount = watchedKeys
    ? credits.filter((credit) => isWatched(credit, watchedKeys)).length
    : 0;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">Filmography</h2>
        {credits.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {watchedKeys ? (
              <>
                You&rsquo;ve watched{" "}
                <span className="font-mono text-foreground">{watchedCount}</span> of{" "}
                <span className="font-mono text-foreground">{credits.length}</span>
              </>
            ) : (
              <>
                <span className="font-mono text-foreground">{credits.length}</span>{" "}
                {credits.length === 1 ? "title" : "titles"}
              </>
            )}
          </p>
        )}
      </div>
      {credits.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No acting credits yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
          {credits.map((credit) => (
            <PersonCreditCard
              key={`${credit.mediaType}-${credit.id}`}
              credit={credit}
              watched={isWatched(credit, watchedKeys)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
