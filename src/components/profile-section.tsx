import Image from "next/image";
import Link from "next/link";

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

export type ProfileSectionItem = {
  id: string | number;
  title: string;
  posterPath: string | null;
  href: string;
};

type ProfileSectionProps = {
  title: string;
  items: ProfileSectionItem[];
  total: number;
  seeAllHref: string;
  emptyMessage: string;
};

export const ProfileSection = ({
  title,
  items,
  total,
  seeAllHref,
  emptyMessage,
}: ProfileSectionProps) => (
  <section className="mt-8 first:mt-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {total > items.length && (
        <Link
          href={seeAllHref}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          See all
        </Link>
      )}
    </div>

    {items.length === 0 ? (
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {emptyMessage}
      </p>
    ) : (
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-neutral-800">
              {item.posterPath ? (
                <Image
                  src={`${TMDB_POSTER_BASE_URL}${item.posterPath}`}
                  alt={item.title}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-neutral-400">
                  No poster
                </div>
              )}
            </div>
            <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
          </Link>
        ))}
      </div>
    )}
  </section>
);
