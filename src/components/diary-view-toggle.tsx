import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { diaryHref, type DiaryView } from "@/lib/diary-view";

const OPTIONS = [
  { view: "grid", label: "Grid view", Icon: LayoutGrid },
  { view: "list", label: "List view", Icon: List },
] as const;

type DiaryViewToggleProps = {
  basePath: string;
  view: DiaryView;
  /** Current page, kept when switching view on paginated lists. */
  page?: number;
};

export const DiaryViewToggle = ({ basePath, view, page }: DiaryViewToggleProps) => (
  <nav aria-label="Diary view" className="flex shrink-0 gap-1 rounded-md border border-border p-0.5">
    {OPTIONS.map(({ view: option, label, Icon }) => {
      const active = option === view;

      return (
        <Link
          key={option}
          href={diaryHref(basePath, { view: option, page })}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          title={label}
          className={`rounded p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="size-5" aria-hidden />
        </Link>
      );
    })}
  </nav>
);
