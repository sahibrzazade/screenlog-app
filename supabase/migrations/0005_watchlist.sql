-- watchlist: movies/shows a user wants to watch (no rating/review, just a to-watch marker)
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  added_at timestamptz not null default now()
);

create unique index watchlist_user_item_unique on public.watchlist (user_id, tmdb_id, media_type);

alter table public.watchlist enable row level security;

create policy "watchlist: select own"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "watchlist: insert own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "watchlist: delete own"
  on public.watchlist for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.watchlist to authenticated;
