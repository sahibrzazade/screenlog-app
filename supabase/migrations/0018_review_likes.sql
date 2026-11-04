-- review_likes: a user liking someone else's review (spec: "Review likes").
-- Reviews are the rating/review columns of the three log tables, so a like
-- points at exactly one log row through one of three nullable foreign keys.
-- Real FKs (not a polymorphic type + id pair) mean deleting a log deletes its
-- likes, and a like can never point at a log that doesn't exist.
create table public.review_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  movie_log_id uuid references public.movie_logs (id) on delete cascade,
  show_log_id uuid references public.show_logs (id) on delete cascade,
  season_log_id uuid references public.season_logs (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint review_likes_one_log check (num_nonnulls(movie_log_id, show_log_id, season_log_id) = 1)
);

-- One like per user per review. Partial unique indexes led by the log id
-- also serve "likes of this review" (counts, likers modal, popular sort).
create unique index review_likes_movie_log_user_idx
  on public.review_likes (movie_log_id, user_id) where movie_log_id is not null;
create unique index review_likes_show_log_user_idx
  on public.review_likes (show_log_id, user_id) where show_log_id is not null;
create unique index review_likes_season_log_user_idx
  on public.review_likes (season_log_id, user_id) where season_log_id is not null;

-- "Reviews this user liked", newest first: the liked reviews page and the
-- activity feed's likes by followed users.
create index review_likes_user_created_idx on public.review_likes (user_id, created_at desc);

alter table public.review_likes enable row level security;

-- Like counts and likers are public, guests included (like the logs, 0009).
create policy "review_likes: select all"
  on public.review_likes for select
  using (true);

-- A user can only like as themselves, only a review with written text, and
-- never their own. Exactly one FK is set (check above), so exactly one
-- branch can match. The log tables are publicly readable, so these lookups
-- see every row.
create policy "review_likes: insert own"
  on public.review_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.movie_logs log
        where log.id = movie_log_id
          and log.user_id <> auth.uid()
          and nullif(btrim(log.review), '') is not null
      union all
      select 1 from public.show_logs log
        where log.id = show_log_id
          and log.user_id <> auth.uid()
          and nullif(btrim(log.review), '') is not null
      union all
      select 1 from public.season_logs log
        where log.id = season_log_id
          and log.user_id <> auth.uid()
          and nullif(btrim(log.review), '') is not null
    )
  );

-- Unliking: only your own likes. No update policy — a like is never edited.
create policy "review_likes: delete own"
  on public.review_likes for delete
  using (auth.uid() = user_id);

grant select on public.review_likes to anon;
grant select, insert, delete on public.review_likes to authenticated;
grant select, insert, delete on public.review_likes to service_role;
