-- movie_logs: one row per user per movie watch entry
create table public.movie_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_movie_id integer not null,
  rating numeric(2, 1) check (rating >= 0.5 and rating <= 5 and rating * 2 = floor(rating * 2)),
  review text,
  watched_date date not null default current_date,
  rewatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index movie_logs_user_movie_idx on public.movie_logs (user_id, tmdb_movie_id);

alter table public.movie_logs enable row level security;

create trigger set_movie_logs_updated_at
  before update on public.movie_logs
  for each row execute procedure public.set_updated_at();

create policy "movie_logs: select own"
  on public.movie_logs for select
  using (auth.uid() = user_id);

create policy "movie_logs: insert own"
  on public.movie_logs for insert
  with check (auth.uid() = user_id);

create policy "movie_logs: update own"
  on public.movie_logs for update
  using (auth.uid() = user_id);

create policy "movie_logs: delete own"
  on public.movie_logs for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.movie_logs to authenticated;
