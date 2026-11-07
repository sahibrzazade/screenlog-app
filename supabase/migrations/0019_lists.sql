-- lists + list_items: users' own ordered lists of movies and shows (spec:
-- "Custom lists"). Every list is public; only its owner can change it.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  -- Set by the server actions, including when items change, so the lists page
  -- can order by last activity.
  updated_at timestamptz not null default now(),
  -- Measures the raw title: trimming first would let whitespace padding through.
  constraint lists_title_length check (char_length(title) <= 100 and btrim(title) <> ''),
  constraint lists_description_length check (char_length(description) <= 1000)
);

-- A user's lists, most recently updated first (lists page, add-to-list modal).
create index lists_user_updated_idx on public.lists (user_id, updated_at desc);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null,
  position integer not null,
  added_at timestamptz not null default now(),
  constraint list_items_tmdb_id_positive check (tmdb_id > 0),
  constraint list_items_media_type check (media_type in ('movie', 'tv')),
  constraint list_items_position_non_negative check (position >= 0),
  -- A title appears once per list. Its leading list_id also serves "which of
  -- my lists hold this title" in the add-to-list modal.
  constraint list_items_unique_title unique (list_id, tmdb_id, media_type)
);

-- Positions aren't unique: a reorder rewrites several rows, and duplicates
-- must not fail it midway. Order is by position within one list.
create index list_items_list_position_idx on public.list_items (list_id, position);

-- At most 100 items per list. Enforced here because a signed-in user can reach
-- the table directly through the API, skipping the server actions. Runs as the
-- caller, so RLS still applies.
create function public.enforce_list_item_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- An item staying in its list doesn't add to it.
  if tg_op = 'UPDATE' and new.list_id = old.list_id then
    return new;
  end if;

  -- Locks the list so concurrent inserts can't pass the limit together.
  perform 1 from public.lists where id = new.list_id for update;

  if (select count(*) from public.list_items where list_id = new.list_id) >= 100 then
    raise exception 'A list can hold at most 100 items';
  end if;

  return new;
end;
$$;

create trigger list_items_limit
  before insert or update of list_id on public.list_items
  for each row execute function public.enforce_list_item_limit();

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- Lists are public, guests included (like logs, 0009, and watchlists, 0016).
create policy "lists: select all"
  on public.lists for select
  using (true);

create policy "lists: insert own"
  on public.lists for insert
  with check (auth.uid() = user_id);

create policy "lists: update own"
  on public.lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lists: delete own"
  on public.lists for delete
  using (auth.uid() = user_id);

create policy "list_items: select all"
  on public.list_items for select
  using (true);

-- Item writes belong to the parent list's owner. The update policy's check
-- also stops an item being moved into someone else's list.
create policy "list_items: insert own"
  on public.list_items for insert
  with check (
    exists (select 1 from public.lists list where list.id = list_id and list.user_id = auth.uid())
  );

create policy "list_items: update own"
  on public.list_items for update
  using (
    exists (select 1 from public.lists list where list.id = list_id and list.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.lists list where list.id = list_id and list.user_id = auth.uid())
  );

create policy "list_items: delete own"
  on public.list_items for delete
  using (
    exists (select 1 from public.lists list where list.id = list_id and list.user_id = auth.uid())
  );

grant select on public.lists to anon;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.lists to service_role;

grant select on public.list_items to anon;
grant select, insert, update, delete on public.list_items to authenticated;
grant select, insert, update, delete on public.list_items to service_role;
