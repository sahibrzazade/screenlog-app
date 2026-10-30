import type { ReactNode } from "react";

type HomeSectionProps = {
  title: string;
  /** Optional link/control on the right of the header rule, e.g. "See all". */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Letterboxd-style home page section: a small uppercase heading sitting on a
 * hairline rule. Every home section uses this so they share one spacing and
 * header pattern instead of each picking its own padding.
 */
export const HomeSection = ({ title, action, children }: HomeSectionProps) => (
  <section className="mx-auto max-w-5xl px-4 pt-12">
    <div className="flex items-baseline justify-between border-b border-border pb-2">
      <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);
