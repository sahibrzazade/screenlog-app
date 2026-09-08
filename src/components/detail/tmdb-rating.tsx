import { Star, Users } from "lucide-react";

type TmdbRatingProps = {
  voteAverage: number;
  voteCount: number;
};

/**
 * TMDB's own aggregate score + vote count, shown in the detail-page meta row.
 * Renders nothing until there's at least one vote.
 */
export const TmdbRating = ({ voteAverage, voteCount }: TmdbRatingProps) => {
  if (voteCount <= 0) return null;

  return (
    <span className="flex items-center gap-1">
      <Star className="size-3.5 fill-accent text-accent" />
      {voteAverage.toFixed(1)}
      <span className="flex items-center gap-0.5 text-subtle-foreground">
        <Users className="size-3.5" />
        {voteCount.toLocaleString()}
      </span>
    </span>
  );
};
