-- Feature 9: public profiles. Widens `profiles` from owner-only reads to
-- public reads, but only for the columns a public profile actually shows
-- (username, avatar_url, showcase) — everything else (email, etc.) stays
-- inaccessible, via column-level grants (RLS alone can't restrict columns).
--
-- Also fixes the profiles_public view's security_definer_view lint: it now
-- runs with the caller's privileges (security_invoker) instead of the view
-- owner's, so it actually goes through the RLS below rather than bypassing
-- it — see memory/deferred_security_definer_view_fix for the earlier analysis.

create or replace view public.profiles_public
  with (security_invoker = true) as
  select id, username, avatar_url, top_movie_ids, top_show_ids, now_watching_show_id
  from public.profiles;

drop policy "profiles: select own" on public.profiles;
create policy "profiles: select all"
  on public.profiles for select
  using (true);

revoke select on public.profiles from authenticated;
grant select (id, username, avatar_url, top_movie_ids, top_show_ids, now_watching_show_id)
  on public.profiles to anon, authenticated;

grant select on public.profiles_public to anon, authenticated;
