-- profiles: 1:1 with auth.users, auto-created on signup
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

grant select, update on public.profiles to authenticated;

-- Shared trigger function: stamps updated_at on any row update.
-- Reused by every table with an update policy (movie_logs, show_logs, season_logs).
create function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
-- Google OAuth populates raw_user_meta_data.avatar_url automatically;
-- email/password signups fall back to a static default avatar served
-- from the app's /public folder (no Supabase Storage needed).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'avatar_url', '/default-avatar.png')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
