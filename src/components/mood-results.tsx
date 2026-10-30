import type { MediaCardItem } from "@/components/media-card";
import { MediaRow } from "@/components/media-row";

type MoodResultsProps = {
  movies: MediaCardItem[];
  shows: MediaCardItem[];
  userId: string | null;
  watchlistKeys: Set<string>;
};

/**
 * "Movies" + "Shows" result rows for MoodPicker's click-driven results.
 * Each row handles its own empty state independently — a mood with zero
 * TV matches still shows its movie row normally.
 */
export const MoodResults = ({ movies, shows, userId, watchlistKeys }: MoodResultsProps) => (
  <>
    <div>
      <h3 className="text-sm font-medium text-foreground">Movies</h3>
      <MediaRow
        items={movies}
        userId={userId}
        watchlistKeys={watchlistKeys}
        emptyMessage="No movies found for this mood."
      />
    </div>

    <div className="mt-6">
      <h3 className="text-sm font-medium text-foreground">Shows</h3>
      <MediaRow
        items={shows}
        userId={userId}
        watchlistKeys={watchlistKeys}
        emptyMessage="No shows found for this mood."
      />
    </div>
  </>
);
