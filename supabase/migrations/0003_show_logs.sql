-- show_logs: one row per user per show watch-through (overall rating, not per-season)
create table public.show_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_show_id integer not null,
  rating numeric(2, 1) check (rating >= 0.5 and rating <= 5 and rating * 2 = floor(rating * 2)),
  review text,
  watched_date date not null default current_date,
  rewatch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index show_logs_user_show_idx on public.show_logs (user_id, tmdb_show_id);

alter table public.show_logs enable row level security;

create trigger set_show_logs_updated_at
  before update on public.show_logs
  for each row execute procedure public.set_updated_at();

create policy "show_logs: select own"
  on public.show_logs for select
  using (auth.uid() = user_id);

create policy "show_logs: insert own"
  on public.show_logs for insert
  with check (auth.uid() = user_id);

create policy "show_logs: update own"
  on public.show_logs for update
  using (auth.uid() = user_id);

create policy "show_logs: delete own"
  on public.show_logs for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.show_logs to authenticated;
