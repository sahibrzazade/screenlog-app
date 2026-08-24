import Link from "next/link";
import { Bookmark, BookOpen, CircleUserRound, LogOut, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

const NavLink = ({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Search;
}) => (
  <Link
    href={href}
    aria-label={label}
    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
  >
    <Icon aria-hidden="true" className="size-4" />
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

export const Navbar = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-xl text-foreground italic"
        >
          Screenlog
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink href="/search" label="Search" icon={Search} />
          {user ? (
            <>
              <NavLink href="/watchlist" label="Watchlist" icon={Bookmark} />
              <NavLink href="/diary" label="Diary" icon={BookOpen} />
              <NavLink href="/profile" label="Profile" icon={CircleUserRound} />
              <form action={logout} className="ml-1">
                <button
                  type="submit"
                  aria-label="Log out"
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};
