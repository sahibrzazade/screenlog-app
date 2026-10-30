-- follows: open, one-way follow between users (no request/approval step).
-- A row means follower_id follows following_id. The composite primary key
-- makes following idempotent (a repeat insert is a unique violation, not a
-- duplicate row), and the check constraint blocks self-follow at the DB
-- level, not only in the UI.
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- The primary key already covers lookups by follower_id ("who do I follow");
-- this covers the reverse ("who follows me": follower counts/lists, and the
-- activity feed's "followed you" items).
create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- Follower/following counts and lists are public, guests included.
create policy "follows: select all"
  on public.follows for select
  using (true);

-- A user can only create or remove follows where they are the follower.
create policy "follows: insert own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "follows: delete own"
  on public.follows for delete
  using (auth.uid() = follower_id);

grant select on public.follows to anon;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.follows to service_role;
