-- Email/password signups now collect a username up front (passed via
-- auth.signUp's options.data). Google OAuth signups have no such step,
-- so raw_user_meta_data.username is absent for them and profiles.username
-- stays null until they're prompted on /choose-username after OAuth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'avatar_url', '/default-avatar.png')
  );
  return new;
end;
$$;
