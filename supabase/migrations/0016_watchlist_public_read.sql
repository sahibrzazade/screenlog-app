-- Public watchlists: any visitor (including anon) can read every user's
-- watchlist, so the activity feed can show "X added Y to their watchlist"
-- for followed users. Explicit product decision (2026-10-30), applies to
-- every existing watchlist too. Writes stay owner-only: the insert/delete
-- policies from 0005 are untouched.

drop policy "watchlist: select own" on public.watchlist;
create policy "watchlist: select all"
  on public.watchlist for select
  using (true);
grant select on public.watchlist to anon;
