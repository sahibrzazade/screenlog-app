import { MediaCard } from "@/components/media-card";
import { toMediaCardItem } from "@/lib/tmdb/to-media-card-item";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

type MoreLikeThisProps = {
  items: TmdbSearchResult[];
  mediaType: "movie" | "tv";
};

/** Horizontally scrolling "More Like This" row on a detail page. */
export const MoreLikeThis = ({ items, mediaType }: MoreLikeThisProps) => {
  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">More Like This</h2>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <div key={item.id} className="w-28 shrink-0 sm:w-32">
            <MediaCard {...toMediaCardItem(item, mediaType)} />
          </div>
        ))}
      </div>
    </section>
  );
};
