import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { DroppedBadge } from "@/components/dropped-badge";
import { posterUrl } from "@/lib/tmdb/images";

export type ProfileSectionItem = {
  id: string | number;
  title: string;
  posterPath: string | null;
  href: string;
  dropped?: boolean;
};

type ProfileSectionProps = {
  title: string;
  /** Decorative icon before the title (hidden from screen readers — the title says it all). */
  icon?: LucideIcon;
  items: ProfileSectionItem[];
  total: number;
  seeAllHref: string;
  emptyMessage: string;
  /**
   * Fixed number of slots to visualize (e.g. 4 for a "Top 4" showcase list).
   * When set, unfilled slots render as empty placeholder cards instead of
   * the section just showing fewer items or an empty-state message.
   */
  capacity?: number;
  /**
   * Owner-only shortcut to `/settings` for showcase sections (Top 4 movies/
   * shows, Currently watching) — these never have a "See all" (their `total`
   * never exceeds what's already shown), so this replaces that slot instead
   * of competing with it.
   */
  editHref?: string;
};

export const ProfileSection = ({
  title,
  icon: Icon,
  items,
  total,
  seeAllHref,
  emptyMessage,
  capacity,
  editHref,
}: ProfileSectionProps) => {
  const emptySlots = capacity ? Math.max(0, capacity - items.length) : 0;

  return (
    <section className="mt-8 first:mt-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {Icon && <Icon className="size-5 shrink-0 text-accent" aria-hidden />}
          {title}
        </h2>
        {editHref ? (
          <Link
            href={editHref}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Edit
          </Link>
        ) : (
          total > items.length && (
            <Link
              href={seeAllHref}
              className="text-sm text-accent hover:text-accent-hover"
            >
              See all
            </Link>
          )
        )}
      </div>

      {items.length === 0 && !capacity ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => {
            const poster = posterUrl(item.posterPath);

            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.title}
                aria-label={item.dropped ? `${item.title} (dropped)` : item.title}
                className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-surface">
                  {poster ? (
                    <Image
                      src={poster}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-1 text-center text-xs text-subtle-foreground">
                      {item.title}
                    </div>
                  )}
                  {item.dropped && <DroppedBadge variant="overlay" />}
                </div>
              </Link>
            );
          })}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div
              key={`empty-${index}`}
              aria-hidden
              className="aspect-2/3 w-full rounded-md border border-dashed border-border"
            />
          ))}
        </div>
      )}
    </section>
  );
};
