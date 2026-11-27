-- Guests could read every profiles column (created_at, updated_at too).
-- 0014 meant to expose only the public profile columns, but it revoked the
-- table-wide select from `authenticated` only: `anon` kept the table-wide
-- select Supabase grants by default, which outranks column grants. Found by
-- the RLS tests (rls/profiles-watchlist.test.ts).
--
-- Revoking a table privilege also revokes that privilege on each column, so
-- the public columns are granted again afterwards. Any column added later
-- stays hidden from guests until it is granted here on purpose.
revoke select on public.profiles from anon;

grant select (id, username, avatar_url, top_movie_ids, top_show_ids, now_watching_show_id)
  on public.profiles to anon;
