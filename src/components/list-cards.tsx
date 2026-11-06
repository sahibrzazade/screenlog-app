import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LIST_CARD_POSTERS, type ListCardData } from "@/lib/lists";
import { posterUrl } from "@/lib/tmdb/images";

const POSTER_CLASS = "relative h-15 w-10 shrink-0 overflow-hidden rounded bg-surface ring-2 ring-background";

/** First posters, overlapping. Always four slots, so cards line up however full a list is. */
const PosterStack = ({ posters }: { posters: ListCardData["posters"] }) => (
  <div aria-hidden className="flex shrink-0 *:not-first:-ml-6 sm:*:not-first:-ml-5">
    {Array.from({ length: LIST_CARD_POSTERS }, (_, index) => {
      const poster = posters[index];
      const url = poster ? posterUrl(poster.posterPath) : null;
      return (
        <div key={index} className={POSTER_CLASS}>
          {url && <Image src={url} alt="" fill sizes="40px" className="object-cover" />}
        </div>
      );
    })}
  </div>
);

/** A user's lists; each whole card opens the list. */
export const ListCards = ({ lists, username }: { lists: ListCardData[]; username: string }) => (
  <ul className="mt-4 flex flex-col gap-2">
    {lists.map((list) => (
      <li key={list.id}>
        <Link
          href={`/user/${username}/lists/${list.id}`}
          className="group flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PosterStack posters={list.posters} />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground [overflow-wrap:anywhere]">{list.title}</span>
            <span className="block text-sm text-muted-foreground">
              {list.itemCount} {list.itemCount === 1 ? "title" : "titles"}
            </span>
            {list.description && (
              <span className="block truncate text-sm text-muted-foreground">{list.description}</span>
            )}
          </span>
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
      </li>
    ))}
  </ul>
);
