-- Public reviews: any visitor (including anon) can read every user's rating/review.
-- Writes remain owner-only; the insert/update/delete policies from earlier
-- migrations are untouched.

drop policy "movie_logs: select own" on public.movie_logs;
create policy "movie_logs: select all"
  on public.movie_logs for select
  using (true);
grant select on public.movie_logs to anon;

drop policy "show_logs: select own" on public.show_logs;
create policy "show_logs: select all"
  on public.show_logs for select
  using (true);
grant select on public.show_logs to anon;

drop policy "season_logs: select own" on public.season_logs;
create policy "season_logs: select all"
  on public.season_logs for select
  using (true);
grant select on public.season_logs to anon;

-- profiles itself stays owner-only (see profiles: select own in 0001).
-- A view limited to (id, username) is the public attribution surface —
-- it can never leak avatar_url or any future private column, regardless
-- of grants on the underlying table.
create view public.profiles_public as
  select id, username from public.profiles;

grant select on public.profiles_public to anon, authenticated;
