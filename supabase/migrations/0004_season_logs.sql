-- season_logs: one row per user per season watch-through
create table public.season_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_show_id integer not null,
  season_number integer not null check (season_number >= 0),
  rating numeric(2, 1) check (rating >= 0.5 and rating <= 5 and rating * 2 = floor(rating * 2)),
  review text,
  watched_date date not null default current_date,
  rewatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index season_logs_user_show_season_idx on public.season_logs (user_id, tmdb_show_id, season_number);

alter table public.season_logs enable row level security;

create trigger set_season_logs_updated_at
  before update on public.season_logs
  for each row execute procedure public.set_updated_at();

create policy "season_logs: select own"
  on public.season_logs for select
  using (auth.uid() = user_id);

create policy "season_logs: insert own"
  on public.season_logs for insert
  with check (auth.uid() = user_id);

create policy "season_logs: update own"
  on public.season_logs for update
  using (auth.uid() = user_id);

create policy "season_logs: delete own"
  on public.season_logs for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.season_logs to authenticated;
