import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type AuthCardProps = {
  children: ReactNode;
};

/** The centered glass card that sits above the poster-grid background on login/signup. */
export const AuthCard = ({ children }: AuthCardProps) => (
  <div className="relative z-10 flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <Link href="/" aria-label="Screenlog" className="inline-flex">
        <Image
          src="/screenlog-brand-assets/02-logo/screenlog-logo-dark-trimmed.png"
          alt="Screenlog"
          width={1763}
          height={349}
          className="h-8 w-auto"
        />
      </Link>
      <div className="mt-8">{children}</div>
    </div>
  </div>
);
