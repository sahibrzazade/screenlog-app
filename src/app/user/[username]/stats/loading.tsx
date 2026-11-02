/** Skeleton while logs and TMDB runtimes load; mirrors the stats page layout. */
const StatsLoading = () => (
  <main aria-busy="true" className="mx-auto max-w-2xl px-4 py-6">
    <span className="sr-only">Loading stats…</span>
    <div aria-hidden="true">
      <div className="h-4 w-28 animate-pulse rounded bg-surface" />
      <div className="mt-3 h-7 w-48 animate-pulse rounded bg-surface" />
      <div className="mt-4 h-10 w-64 max-w-full animate-pulse rounded-md bg-surface" />
      <div className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2 py-1">
            <div className="h-7 w-12 animate-pulse rounded bg-surface" />
            <div className="h-3 w-14 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  </main>
);

export default StatsLoading;
