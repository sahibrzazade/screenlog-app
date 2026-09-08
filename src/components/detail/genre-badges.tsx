type GenreBadgesProps = {
  genres: { id: number; name: string }[];
};

/** Sidebar "Genres" card on a detail page. Renders nothing when empty. */
export const GenreBadges = ({ genres }: GenreBadgesProps) => {
  if (genres.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Genres
      </span>
      <div className="flex flex-wrap gap-1.5">
        {genres.map((genre) => (
          <span
            key={genre.id}
            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
          >
            {genre.name}
          </span>
        ))}
      </div>
    </div>
  );
};
