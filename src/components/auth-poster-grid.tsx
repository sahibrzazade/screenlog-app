import Image from "next/image";

type AuthPosterGridProps = {
  posterPaths: string[];
};

/**
 * Decorative, full-bleed background texture for login/signup — a dense tile
 * of small poster thumbnails, heavily dimmed so it reads as atmosphere, not
 * content. Small natural TMDB sizes at a small display size, so unlike a
 * single stretched hero image there's no upscale/blur risk.
 */
export const AuthPosterGrid = ({ posterPaths }: AuthPosterGridProps) => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
    <div className="grid grid-cols-6 gap-2 p-2 opacity-25 sm:grid-cols-8 lg:grid-cols-10">
      {posterPaths.map((path, index) => (
        <div
          key={`${path}-${index}`}
          className="aspect-2/3 overflow-hidden rounded-sm bg-surface grayscale"
        >
          <Image
            src={path}
            alt=""
            width={154}
            height={231}
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
    <div className="absolute inset-0 bg-background/80" />
  </div>
);
