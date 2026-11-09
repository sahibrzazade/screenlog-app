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

/**
 * The watched share as a whole percent for the label ("<1%" when some but
 * under 1%), and the bar width, at least 1% once anything is watched so it
 * never looks empty.
 */
export const watchedShare = (watched: number, total: number) => {
  const percent = total > 0 ? (watched / total) * 100 : 0;
  return {
    label: watched > 0 && percent < 1 ? "<1%" : `${Math.round(percent)}%`,
    barWidth: watched > 0 ? Math.max(percent, 1) : 0,
  };
};

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
  const total = credits.length;
  const watchedCount = watchedKeys
    ? credits.filter((credit) => isWatched(credit, watchedKeys)).length
    : 0;
  const showProgress = watchedKeys !== null && total > 0;
  const share = watchedShare(watchedCount, total);
  const exactLabel = `Watched ${watchedCount} of ${total} ${total === 1 ? "title" : "titles"}`;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">
          Filmography
          {total > 0 && (
            <>
              {" "}
              <span className="ml-1 font-mono text-sm font-normal text-subtle-foreground">{total}</span>
            </>
          )}
        </h2>
        {showProgress && (
          <p className="shrink-0 text-sm text-muted-foreground" aria-hidden>
            <span className="font-mono text-foreground">{watchedCount}</span>
            <span className="font-mono"> / {total}</span> watched ·{" "}
            <span className="font-mono text-foreground">{share.label}</span>
          </p>
        )}
      </div>
      {showProgress && (
        <div
          role="progressbar"
          aria-label={exactLabel}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={watchedCount}
          aria-valuetext={`${watchedCount} of ${total} (${share.label})`}
          className="mt-2 h-1 overflow-hidden rounded-full bg-surface-elevated"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${share.barWidth}%` }}
          />
        </div>
      )}
      {total === 0 ? (
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
