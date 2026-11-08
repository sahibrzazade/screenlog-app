-- Rewatches: a user can log the same movie or season more than once, one row
-- per watch. Drops the one-row-per-title constraints from 0006 and 0008 and
-- puts back plain indexes on the same columns for the per-title lookups.
-- show_logs keeps its unique constraint (0007): a show has one log per user.
-- The existing `rewatch` column (0002, 0004) marks the repeat watches.
--
-- Run only together with the app change that writes logs by id: the old
-- code upserts on these constraints and fails once they're gone.

alter table public.movie_logs
  drop constraint movie_logs_user_movie_unique;

create index movie_logs_user_movie_idx
  on public.movie_logs (user_id, tmdb_movie_id);

alter table public.season_logs
  drop constraint season_logs_user_show_season_unique;

create index season_logs_user_show_season_idx
  on public.season_logs (user_id, tmdb_show_id, season_number);
