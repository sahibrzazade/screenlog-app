import Image from "next/image";

export const Footer = () => (
  <footer className="mt-auto border-t border-border">
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-8 text-center">
      <div>
        <p className="font-display text-lg text-foreground italic">Screenlog</p>
        <p className="mt-1 text-sm text-muted-foreground">Track what you watch.</p>
      </div>

      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <Image src="/tmdb-logo.svg" alt="The Movie Database" width={92} height={12} />
        <span className="text-xs text-subtle-foreground">
          This product uses TMDB and the TMDB APIs but is not endorsed,
          certified, or otherwise approved by TMDB.
        </span>
      </a>
    </div>
  </footer>
);
